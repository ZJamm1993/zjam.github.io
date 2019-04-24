# 动手做一个iOS音乐播放器（2）AVAudioPlayer与AVAudioEngine

AVAudioPlayer播放音频的方法是最简单的，传入一个url或data初始化，然后play、pause、stop、currentTime等操作直接调用，还有播放完成后的代理回调，真是方便。
但也有局限性，它不能做一些例如混响、均衡器等处理。

如果我想要做一个有均衡器调节的播放器，那么我只能自制一个MyAudioPlayer了。
然后仿制了AVAudioPlayer的部分用法：
```
@protocol AVAudioPlayerDelegate;

@interface MyAudioPlayer : NSObject

//@property (nonatomic, strong) NSMutableData *pcmData;
@property (nonatomic, assign) NSTimeInterval currentTime;
@property (nonatomic, assign) NSTimeInterval duration;
@property (nonatomic, strong) NSURL *url;
@property (nonatomic, assign, getter=isPlaying) BOOL playing;
@property (nonatomic, weak) id<AVAudioPlayerDelegate> delegate;

- (instancetype)initWithContentsOfURL:(NSURL *)url error:(NSError **)outError;
- (void)play;
- (void)pause;
- (void)stop;

@end
```

偶然找到了AVFoundation里面有AVAudioEngine这一套更能凸显个性的工具。


其中AVAudioPlayerNode是音源，AVAudioUnitEffect是效果器，最后mix和输出由engine完成
![AVAudioEngine的其中一种连接方法](https://upload-images.jianshu.io/upload_images/11381603-7b75ba993f47f8f6.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

这套工具的用法非常贴近生活，而且有点眼熟。。。。就像下图👇中的样子。
![就是这个感觉](https://upload-images.jianshu.io/upload_images/11381603-aec4356e5cf74966.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

那么我就用MyAudioPlayer来封装这套AVAudioEngine逻辑：

初始化：
```
- (instancetype)initWithContentsOfURL:(NSURL *)url error:(NSError * _Nullable __autoreleasing *)outError {
    self = [super init];
    if (self) {
//        self.duration = 10000000;
        self.url = url;
        [self myInit];
    }
    return self;
}


- (void)myInit {
    // create engine
    self.engine = [[AVAudioEngine alloc] init];

    // 音源
    self.playerNode = [[AVAudioPlayerNode alloc] init];

    // 一个10段均衡器
    self.audioEQ = [[AVAudioUnitEQ alloc] initWithNumberOfBands:10];
    AVAudioUnitEffect *effect = self.audioEQ;
    
    // 各种连线，注意顺序
    AVAudioMixerNode *mixer = self.engine.mainMixerNode;
    AVAudioFormat *format = [mixer outputFormatForBus:0];
    [self.engine attachNode:self.playerNode];
    [self.engine attachNode:effect];
    [self.engine connect:self.playerNode to:effect format:format];
    [self.engine connect:effect to:mixer format:format];
    
    // 打开电源开关
    NSError *error = nil;
    [self.engine startAndReturnError:&error];
    
    // 根据url创建一个audioFile
    self.audioFile = [[AVAudioFile alloc] initForReading:self.url error:nil];
    
    // 计算播放时长，这里似乎一个frame就是一个sample，所以直接用样品数除以采样率得到时间。
    AVAudioFrameCount frameCount = (AVAudioFrameCount)self.audioFile.length;
    double sampleRate = self.audioFile.processingFormat.sampleRate;
    if (sampleRate != 0) {
        self.duration = frameCount / sampleRate;
    } else {
        self.duration = 1;
    }
    
    // play file, or buffer
    __weak typeof(self) weself = self;
    // 我这里用setCurrentTime的方法来控制播放进度
    self.currentTime = 0.01;
    
//    // init a timer to catch current time;
    self.timer = [NSTimer scheduledTimerWithTimeInterval:0.01 repeats:YES block:^(NSTimer *timer) {
        [weself catchCurrentTime];
    }];
}
```
关于这个带block的timer在iOS10之前怎么办，如何[在iOS9或更老系统版本中使用NSTimer+Block方法](https://www.jianshu.com/p/52cb70530e6a)

播放、暂停、停止、完成后代理回调：
```
- (void)play {
    // 记得要电源开着的时候才能让playerNode play，否则会crash。（这不现实啊😂）
    if (!self.engine.running) {
        [self.engine prepare]; // 预防中断恢复后crash！！！
        [self.engine startAndReturnError:nil];
    }
    [self.playerNode play];
}

- (void)pause {
    [self.engine stop]; // 为什么这里要stop呢？如果不，到后面就会发现控制中心里的暂停键不会变化。
    [self.playerNode pause];
}

- (void)stop {
    // 一般来说，stop就代表着结束，那么就全部都结束吧。
    self.delegate = nil; // 手动停的必须设delegate nil，不然回调出去又播放下一首了，内存超大
    if (self.isPlaying) {
        [self.playerNode stop];
    }
    [self.engine stop];
}

- (void)didFinishPlay { 
    // 这里还用着原来的AVAudioPlayerDelegate
    if ([self.delegate respondsToSelector:@selector(audioPlayerDidFinishPlaying:successfully:)]) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.delegate audioPlayerDidFinishPlaying:(id)self successfully:self.isPlaying];
        });
    }
}

- (BOOL)isPlaying {
    return self.playerNode.isPlaying;
}
```

难点来了，设置和获取当前时间：
```
// 设置当前播放时间，上文中调用了一下self.currentTime = xxx，目的是为了顺便设置一下播放内容
- (void)setCurrentTime:(NSTimeInterval)currentTime {
    _currentTime = currentTime;
    
    BOOL isPlaying = self.isPlaying;
    id lastdelegate = self.delegate;
    self.delegate = nil;
    [self.playerNode stop];
    self.delegate = lastdelegate;
    __weak typeof(self) weself = self;
    AVAudioFramePosition startingFrame = currentTime * self.audioFile.processingFormat.sampleRate;
    // 要根据总时长和当前进度，找出起始的frame位置和剩余的frame数量
    AVAudioFrameCount frameCount = (AVAudioFrameCount)(self.audioFile.length - startingFrame);
    if (frameCount > 1000) { // 当剩余数量小于0时会crash，随便设个数
        lastStartFramePosition = startingFrame;
        [self.playerNode scheduleSegment:self.audioFile startingFrame:startingFrame frameCount:frameCount atTime:nil completionHandler:^{
            [weself didFinishPlay];
        }]; // 这里只有这个scheduleSegement的方法播放快进后的“片段”
    }
    if (isPlaying) {
        [self.playerNode play]; // 恢复播放
    }
}

// 获取当前播放时间
- (void)catchCurrentTime {
    if (self.playing) {
        AVAudioTime *playerTime = [self.playerNode playerTimeForNodeTime:self.playerNode.lastRenderTime];
        _currentTime = (lastStartFramePosition + playerTime.sampleTime) / playerTime.sampleRate;
        // 注意这里用了上文设置的lastStartFramePosition，原因是sampleTime是相对于它的，所以绝对的播放位置应该是lastStartFramePosition + sampleTime
    }
    if (_currentTime > self.duration) {
        [self.playerNode stop];
    }
```

最后记得dealloc时：
```
- (void)dealloc {
    NSLog(@"dealloc: %@", self);
    self.delegate = nil;
    [self.playerNode stop];
    [self.engine stop];
    [self.timer invalidate];
}
```

项目代码：https://github.com/ZJamm1993/simple_music_player.git
