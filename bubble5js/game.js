var DirectionFacing = {
    Right : 0,
    Up : 1,
    Left : 2,
    Down : 3,

    QuadrantOne : 1,
    QuadrantTwo : 2,
    QuadrantThree : 3,
    QuadrantFour : 4,

    Angle00 : 0,
    Angle45 : 1,
    Angle90 : 2,
    Angle135 : 3
};

var currentGameLayer = null;
var currentDiedTime = 0;
var totalDataPacketCount = 0;

window.onkeydown = function(){
    // if(13 == event.keyCode){
        // console.log('browser is not ie and enter key down' + event.keyCode);
    // }
    if (currentGameLayer) {
        currentGameLayer.actionWithKeyEvent(event);
    }
}

window.onload = function(){
    cc.game.onStart = function(){

        // cc.view.setDesignResolutionSize(1024, 576, cc.ResolutionPolicy.EXACT_FIT);
        // cc.view.setResizeCallback(function() {
        //     cc.view.setDesignResolutionSize(1024, 576, cc.ResolutionPolicy.EXACT_FIT);
        // });
        //load resources
        cc.LoaderScene.preload([], function () {
            var MyScene = cc.Scene.extend({
                onEnter:function () {
                    this._super();
                    var gl = new GameLayer();
                    currentGameLayer = gl;
                    this.addChild(gl, 1);
                    // this.sheduleUpdate(gl);
                }
                
            });
            cc.director.runScene(new MyScene());
        }, this);
    };
    cc.game.run("gameCanvas");

};

var isGameOver = false;

var GameLayer = cc.LayerColor.extend({
    _currentManualReflector:null,
    _currentReflectorIndicator:null,
    onEnter:function() {
        this._super();
        this.addTouchAction();
    },
    addTouchAction:function() {
        var myLayer = this;
        cc.eventManager.addListener(cc.EventListener.create({
            event:cc.EventListener.TOUCH_ONE_BY_ONE,
            onTouchBegan:function(event) {
                console.log("onMouseDown");
                var point = event.getLocation();
                myLayer.didTouchOnPoint(point);
                return true;
            },
        }), myLayer);
    },
    didTouchOnPoint:function(point) {
        var children = this.getChildren();
        var testObjs = new Array();
        var particles = new Array();
        for (let index in children) {
            var child = children[index];
            if (child.isClass("BaseSprite") && child.isType("ReflectorType")) {
                if (child._reflectorType == "ManualReflector") {
                    var rect = child.getRect();
                    if (cc.rectContainsPoint(rect, point)) {
                        this.setCurrentManualReflector(child);
                        return;
                    }
                }
            }
        }
    },
    actionWithKeyEvent:function(keyEvent) {
        var isA = keyEvent.keyCode == 65;
        var isD = keyEvent.keyCode == 68;
        var rota = 0; //this._currentManualReflector.getRotation();
        var delta = M_PI / 48;
        if (isA) {
            rota = delta;
        } else if (isD) {
            rota = -delta;
        }
        // this._currentManualReflector.setRotation(rota);
        // this._currentManualReflector.runAction()
        rota = this._currentManualReflector.getRotation() + rota;
        rota = Math.round(rota / delta) * delta;

        var rotaByAction = cc.rotateTo(0.25, -rota / M_PI * 180);
        this._currentManualReflector.stopAllActions();
        this._currentManualReflector.runAction(rotaByAction);
        /* 
        this._currentManualReflector.setRotation(rota);
        // */
    },
    ctor:function() {
        // this._super();
        this._super(cc.color(0, 40, 45, 255));
        // var size = cc.director.getWinSize();

        // var sprite = cc.Sprite.create("Textures/ointer.png");
        // sprite.setPosition(size.width / 2, size.height / 2);
        // // sprite.setScale(1);
        // this.addChild(sprite, 0);

        // var label = cc.LabelTTF.create("Hello World", "Arial", 40);
        // label.setColor(0,0,0);
        // label.setPosition(size.width / 2, size.height / 2);
        // this.addChild(label, 1);
        this.loadObjectsFromFile();
        this.scheduleUpdate();
    },
    setCurrentManualReflector:function(reflector) {
        this._currentManualReflector = reflector;
        if (this._currentReflectorIndicator == null) {
            this._currentReflectorIndicator = new NoHitSprite("Textures/Empty.png");
            this._currentReflectorIndicator._className = "";
            this.addChild(this._currentReflectorIndicator);
        }
        this._currentReflectorIndicator.setPosition(this._currentManualReflector.getPosition());
    },
    loadObjectsFromFile:function() {
        var myLayer = this;
        var randomValue = Math.floor(Math.random() * 13 + 1);
        // randomValue = 13;
        var missionFile = "Configs/mission" + randomValue +".json";
        // missionFile = "Configs/test.txt";
        var req = new XMLHttpRequest();
        req.open("GET", missionFile, true);
        req.send(null);
        req.onreadystatechange = function(){
            if(req.readyState == 4 && req.status == 200){
                var text = req.responseText;
                var array = JSON.parse(text);

                for(let index in array) {
                    var obj = array[index];
                    var dict = obj;
                    var name = dict.name;
                    var x = dict.x | 0;
                    var y = dict.y | 0;
                    var face = dict.face | 0;
                    var type = dict.type | 0;
                    var disabled = dict.disabled | 0;
                    var realX = OBJ_BLOCK_WIDTH / 2 + x * OBJ_BLOCK_WIDTH;
                    var realY = OBJ_BLOCK_WIDTH / 2 + y * OBJ_BLOCK_WIDTH;
                    // var position = 

                    var spr = null;
                    if (name == "LazerSource") {
                        spr = new LazerSource(face, disabled);
                    } else if (name == "NormalBlock") {
                        spr = new NormalBlock(face, type);
                    } else if (name == "NormalReflector") {
                        spr = new NormalReflector(face);
                    } else if (name == "ManualReflector") {
                        spr = new ManualReflector(face);
                    } else if (name == "AutoReflector") {
                        spr = new AutoReflector();
                    } else if (name == "DataPacket") {
                        spr = new DataPacket();
                        totalDataPacketCount ++;
                    } else if (name == "FirePacket") {
                        spr = new FirePacket();
                    }

                    if (spr != null) {
                        console.log("loaded:" + name);  
                        spr.setPosition(realX, realY);
                        myLayer.addChild(spr);
                        if (myLayer._currentManualReflector == null && name == "ManualReflector") {
                            myLayer.setCurrentManualReflector(spr);
                        }
                    }
                }
            }
        };
    },
    update:function(dt) {
        if (isGameOver) {
            return;
        }
        // check game over
        var gameover = currentDiedTime > 2;
        if (gameover) {
            isGameOver = true;
            location.reload();
            return;
        }

        var children = this.getChildren();
        var testObjs = new Array();
        var leftDataPacketCount = 0;
        for (let index in children) {
            var child = children[index];
            if (child.isClass("BaseSprite")) {
                child.run();
                testObjs.push(child);
                if (child.isType("DataPacket")) {
                    leftDataPacketCount ++;
                }
            }
        }
        if (totalDataPacketCount > 0 && leftDataPacketCount <= 0) {
            isGameOver = true;
            location.reload();
            return;
        }
        var particle = sharedLazerParticle;
        if (particle) {
            particle.testWithObjects(testObjs);
        }
          
    },
});


// base sprite
var BaseSprite = cc.Sprite.extend({
    _className:"BaseSprite",
    _typeName:"NormalType",
    ctor:function(fileName, rect) {
        if (fileName == undefined) {
            fileName = "Textures/Empty.png";
        } 
        if (rect == undefined) {
            rect = cc.rect(OBJ_BLOCK_RECT);
        }
        this._super(fileName, rect);
        // this.setScale(0.5);
        // this.setRectInPixel:()
    },
    run:function() {

    },
    crash:function() {

    },
    getHurt:function() {

    },
    getSize:function() {
        return cc.size(OBJ_BLOCK_SIZE);
    },
    getRect:function() {
        let size = this.getSize();
        let center = this.getPosition();
        return cc.rect(center.x - size.width / 2, center.y - size.height / 2, size.width, size.height);
    },
    // 用弧度，逆时针，符合小学数学
    setRotation:function(rotation) {
        this._super(-rotation * 180.0 / M_PI);
    },
    getRotation:function() {
        var angle = this._super();
        return -angle * M_PI / 180.0;
    },
    getClassName:function() {
        return this._className;
    },
    isClass:function(className) {
        return (this.getClassName() == className);
    },
    getTypeName:function() {
        return this._typeName;
    },
    isType:function(typeName) {
        return (this.getTypeName() == typeName);
    }
});

var NoHitSprite = BaseSprite.extend({
    _className:"NoHitSprite",
    _typeName:"NoHitSprite",
});

var BlockType = {
    Chip:0,
    Resistance:1
};

var NormalBlock = BaseSprite.extend({
    changedTexture:false,
    _typeName:"NormalBlock",
    myType:0,
    myFacing:0,
    ctor:function(facing, type) {
        if (type == BlockType.Chip) {
            this._super("Textures/NormalBlockChip.png");
        } else {
            this._super("Textures/NormalBlockResistance.png");
        }
        if (facing != DirectionFacing.Up && facing != DirectionFacing.Right) {
            facing = DirectionFacing.Right;
        }
        if (facing == DirectionFacing.Up) {
            this.setRotation(M_PI_2);
        }
        this.myType = type;
        this.myFacing = facing;
    },
    run:function() {
        if (this.myType == BlockType.Chip && !this.changedTexture) {
            this.changedTexture = true;
            var hasLeft = false;
            var hasRight = false;
            var hasTop = false;
            var hasBottom = false;
            var leftPoint = zz.pointOffset(this.getPosition(), -OBJ_BLOCK_WIDTH, 0);
            var rightPoint = zz.pointOffset(this.getPosition(), OBJ_BLOCK_WIDTH, 0);
            var topPoint = zz.pointOffset(this.getPosition(), 0, OBJ_BLOCK_WIDTH);
            var bottomPoint = zz.pointOffset(this.getPosition(), 0, -OBJ_BLOCK_WIDTH);
            var children = this.getParent().getChildren();

            for (let i in children) {
                var node = children[i];
                if (node === this) {
                    continue;
                }
                if (node.isClass("BaseSprite") && node.isType("NormalBlock")) {
                    if (node.myType == this.myType) {
                        var rect = node.getRect();
                        if (cc.rectContainsPoint(rect, leftPoint)) {
                            hasLeft = true;
                        }
                        if (cc.rectContainsPoint(rect, rightPoint)) {
                            hasRight = true;
                        }
                        if (cc.rectContainsPoint(rect, topPoint)) {
                            hasTop = true;
                        }
                        if (cc.rectContainsPoint(rect, bottomPoint)) {
                            hasBottom = true;
                        }
                    }
                }
            }

            if ((!hasLeft && !hasRight && this.myFacing == DirectionFacing.Right) ||
                !hasTop && !hasBottom && this.myFacing == DirectionFacing.Up) {
                this.initWithFile("Textures/NormalBlockChipSmall.png");
            } else if (this.myFacing == DirectionFacing.Right) {
                if (!(hasLeft && hasRight) && (hasLeft || hasRight)) {
                    this.initWithFile("Textures/NormalBlockChipHead.png");
                    if (hasLeft) {
                        this.setRotation(0);
                    } else {
                        this.setRotation(M_PI);
                    }
                }
            } else if (this.myFacing == DirectionFacing.Up) {
                if (!(hasTop && hasBottom) && (hasTop || hasBottom)) {
                    this.initWithFile("Textures/NormalBlockChipHead.png");
                    if (hasBottom) {
                        this.setRotation(M_PI_2);
                    } else {
                        this.setRotation(-M_PI_2);
                    }
                }
            }
        }
    }
});

var BaseReflector = BaseSprite.extend({
    _typeName:"ReflectorType",
    _reflectorType:"BaseReflector",
    getRealZRotation:function() {
        return this.getRotation();
    },
    getReflectorType:function() {
        return this._reflectorType;
    },
    getNewLineWithOldLine:function(oldLine) {
        // return oldLine;
        var selfRealRotation = this.getRealZRotation();
        var selfLine = zz.line(this.getPosition().x, this.getPosition().y, selfRealRotation);
        var intersectionPoint = zz.pointIntersectionFromLines(oldLine, selfLine);
        if (!this.isPointInside(intersectionPoint)) {
            return oldLine;
        }

        var reflectedZRotation = (selfRealRotation - oldLine.alpha) + selfRealRotation;
        return zz.line(intersectionPoint.x, intersectionPoint.y, reflectedZRotation);
    },
    isPointInside:function(point) {
        return cc.rectContainsPoint(this.getRect(), point);
    }
});

var NormalReflector = BaseReflector.extend({
    _reflectorType:"NormalReflector",
    ctor:function(facing) {
        this._super("Textures/NormalReflector.png");
        var rota = 0;
        if (facing == DirectionFacing.QuadrantTwo) {
            rota = M_PI / 2;
        } else if (facing == DirectionFacing.QuadrantThree) {
            rota = M_PI;
        } else if (facing == DirectionFacing.QuadrantFour) {
            rota = -M_PI / 2;
        }
        this.setRotation(rota);
    },
    getRealZRotation:function() {
        return this.getRotation() - (M_PI / 4);
    },
    isPointInDarkSide:function(point) {
        // return false;
        var myPosition = this.getPosition();
        var pointOffset = zz.pointOffset(point, -myPosition.x, -myPosition.y);
        var rotatedPoint = zz.pointRotateVector(pointOffset, -this.getRotation());
        // var pointInMe = zz.pointOffset(rotatedPoint, -myPosition.x, -myPosition.y);
        var testP = rotatedPoint;
        return (testP.x * -1) - 1 > testP.y;
    },
});

var ManualReflector = BaseReflector.extend({
    _reflectorType:"ManualReflector",
    ctor:function(facing) {
        this._super("Textures/ManualReflector.png");
        var rota = 0;
        if (facing == DirectionFacing.Angle90) {
            rota = M_PI / 2;
        } else if (facing == DirectionFacing.Angle135) {
            rota = (M_PI / 2) + (M_PI / 4);
        } else if (facing == DirectionFacing.Angle45) {
            rota = M_PI / 4;
        }
        this.setRotation(rota);
    },
    isPointInside:function(point) {
        return (this.getRect().width / 2) >= zz.distanceFromPoints(this.getPosition(), point);
    },
});

var AutoReflector = BaseReflector.extend({
    backgroundSpr:null,
    shooterSpr:null,
    _reflectorType:"AutoReflector",
    ctor:function() {
        this._super("Textures/AutoReflectorShooter.png");
        this.backgroundSpr = new BaseSprite("Textures/AutoReflector.png");
        this.addChild(this.backgroundSpr, -1);
        this.backgroundSpr.setPosition(this.getSize().width /2, this.getSize().height / 2);
        // this.shooterSpr = new BaseSprite("Textures/AutoReflectorShooter.png");
        // this.addChild(this.shooterSpr, 1);
        // this.shooterSpr.setPosition(this.getSize().width / 2, this.getSize().height / 2);
        this.schedule(function() {
            this.setRotation(this.getRotation() + (M_PI / 4));
        }, 0.8);
    },
    setRotation:function(rotation) {
        this._super(rotation);
        this.backgroundSpr.setRotation(-rotation);
    },
    getNewLineWithOldLine(oldLine) {
        var shootingOffset = OBJ_BLOCK_WIDTH * 0.4;
        var zRota = this.getRotation();
        var shootingVector = zz.pointRotateVector(cc.p(shootingOffset, 0), zRota);
        var shootingPoint = zz.pointOffset(this.getPosition(), shootingVector.x, shootingVector.y);
        return zz.line(shootingPoint.x, shootingPoint.y, zRota);
    },
    getRect:function() {
        if (this._dying) {
            return cc.rect(0, 0, 0, 0);
        }
        var rect = this._super();
        var shrink = rect.width * 0.15;
        return zz.rectInset(rect, shrink, shrink);
    },
});

let packetLife = 150.0;

var BasePacket = BaseSprite.extend({
    _hits:0,
    _dying:false,
    _explosionFileName:null,
    _tintSprite:null,
    _tintFileName:null,
    ctor:function(filename) {
        this._super(filename);
        if (this._tintFileName) {
            this._tintSprite = new BaseSprite(this._tintFileName);
            this._tintSprite.setPosition(this.getSize().width /2, this.getSize().height / 2);
            this._tintSprite.setOpacity(0);
            this.addChild(this._tintSprite);
        }
    },
    getHurt:function() {
        if (this._dying) {
            return;
        }
        var shakeValue = 0.02;
        var anchor = cc.p(0.5 + shakeValue * cc.randomMinus1To1(), 0.5 + shakeValue * cc.randomMinus1To1());
        this.setAnchorPoint(anchor);
        this._hits ++;
        if (this._tintSprite) {
            this._tintSprite.setOpacity((this._hits / packetLife) * 255);
        }
        if (this._hits > packetLife) {
            this._dying = true;
            if (this._explosionFileName) {
                var explos = new NoHitSprite(this._explosionFileName);
                explos.setPosition(this.getPosition());
                this.getParent().addChild(explos);
                explos.setScale(0.5);
                var spawn = cc.spawn(cc.scaleTo(0.25, 1.5), cc.fadeOut(0.25));
                var finish = cc.callFunc(function(){
                    explos.removeFromParent(true);
                });
                explos.runAction(cc.sequence(spawn, finish));
            }
            this.removeFromParent(true);
            this.didFinishCrash();
        }
    },
    getRect:function() {
        if (this._dying) {
            return cc.rect(0, 0, 0, 0);
        }
        var rect = this._super();
        var shrink = rect.width * 0.15;
        return zz.rectInset(rect, shrink, shrink);
    },
    didFinishCrash:function() {

    }
});

var DataPacket = BasePacket.extend({
    _typeName:"DataPacket",
    _explosionFileName:"Textures/CyanExplosion.png",
    _tintFileName:"Textures/DataPacketTint.png",
    ctor:function() {
        this._super("Textures/DataPacket.png");
    }
});

var FirePacket = BasePacket.extend({
    _typeName:"FirePacket",
    _explosionFileName:"Textures/RedExplosion.png",
    _tintFileName:"Textures/FirePacketTint.png",
    ctor:function() {
        this._super("Textures/FirePacket.png");
    },
    didFinishCrash:function() {
        currentDiedTime ++;
        paused = true;
        var delay = cc.delayTime(2);
        var finish = cc.callFunc(function(){
            paused = false;
        });
        currentGameLayer.runAction(cc.sequence(delay, finish));
    }
});

// lazers
var LazerSource = BaseSprite.extend({
    disabled:0,
    ctor:function(facing, disabled) {
        this._super("Textures/LazerSource.png");
        this.disabled = disabled;
        var rotation = 0;
        if (facing == DirectionFacing.Up) {
            rotation = M_PI / 2;
        } else if (facing == DirectionFacing.Left) {
            rotation = M_PI;
        } else if (facing == DirectionFacing.Down) {
            rotation = -M_PI / 2;
        }
        this.setRotation(rotation);

        if (!disabled) {
            var shooterSpr = new BaseSprite("Textures/LazerSourceShooter.png");
            shooterSpr.setPosition(this.getSize().width, this.getSize().height / 2);
            this.addChild(shooterSpr);
        }
    },
    run:function() {
        // shoot a LazerParticle
        if (this.disabled == 0) {
            if (sharedLazerParticle == null) {
                var particle = new LazerParticle(this.getRotation());
                var originPo = this.getPosition();
                var newPosi = zz.pointOffset(originPo, this.getSize().width / 2 + 10, 0);
                var rotatedPosi = zz.pointRotatePoint(newPosi, originPo, this.getRotation());
                particle.setPosition(rotatedPosi);
                this.getParent().addChild(particle, 100);
                sharedLazerParticle = particle;
            }
        }
    }
});

var turningRed = false;
var paused = false;
var sharedLazerParticle = null;

var LazerParticle = cc.Node.extend({
    _className:"LazerParticle",
    // _drawed:false,
    _realZRotation:0,
    _cacheLines:null,
    _cacheSpark:null,
    ctor:function(zRotation) {
        this._super();
        this._realZRotation = zRotation;
        this._cacheLines = new Array();
        this._cacheSpark = new BaseSprite("Textures/LazerSpark.png");
    },
    getClassName:function() {
        return this._className;
    },
    isClass:function(className) {
        return (this.getClassName() == className);
    },
    hideAllLazerLines:function() {
        var lines = this._cacheLines;
        for (let i in lines) {
            var li = lines[i];
            li.removeFromParent(true);
        }
        if (this._cacheSpark.getParent) {
            this._cacheSpark.removeFromParent(true);
        }
    },
    testWithObjects:function(objects) {
        this.hideAllLazerLines();
        if (paused) {
            return;
        }

        var parentSize = cc.director.getWinSize();
        var parentRect = cc.rect(0, 0, parentSize.width, parentSize.height);

        var lastLine = zz.line(this.getPosition().x, this.getPosition().y, this._realZRotation);
        var lastHitSpr = null;

        var ended = false;
        var testTime = 0;
        while(!ended) {
            testTime ++;
            if (testTime > 50) {
                ended = true;
                break;
            }
            var testMinDistance = 100000;
            var thisHitPoint = zz.pointNotFound();
            var thisHitSpr = null;
            var reflectedLine = zz.line(0, 0, 0);
            var isReflected = false;
            for (let index in objects) {
                var tSpr = objects[index];
                if (tSpr === lastHitSpr) {
                    continue;
                }
                var testRect = tSpr.getRect();
                if (!zz.rectIntersectsLine(testRect, lastLine)) {
                    continue; // don't check too much if not a chance!
                }
                var testHitPoint = zz.pointIntersectionFromRectToLine(testRect, lastLine);
                var testWillBeReflected = false;
                var testReflectedLine = zz.line(0, 0, 0);
                if (!cc.pointEqualToPoint(testHitPoint, zz.pointNotFound())) {
                    if (tSpr.isType("ReflectorType")) {
                        // baljblaklkf
                        testWillBeReflected = true;
                        var willNotHitNotReflectingFace = false; // check false face
                        if (tSpr._reflectorType == "NormalReflector") {
                            willNotHitNotReflectingFace = tSpr.isPointInDarkSide(testHitPoint);
                        }
                        if (willNotHitNotReflectingFace) {
                            testWillBeReflected = false;
                        } else {
                            testReflectedLine = tSpr.getNewLineWithOldLine(lastLine);
                            if (zz.lineEqualToLine(testReflectedLine, lastLine)) {
                                continue;
                            }
                            if (tSpr.getReflectorType() == "AutoReflector") {

                            } else {
                                testHitPoint = cc.p(testReflectedLine.x, testReflectedLine.y);
                            }
                        }
                    } 
                    var thisDistance = zz.distanceFromPoints(cc.p(lastLine.x, lastLine.y), testHitPoint);
                    if (thisDistance < testMinDistance) { // 取最近的一个作为这一轮的结果
                        testMinDistance = thisDistance;
                        thisHitPoint = testHitPoint;
                        thisHitSpr = tSpr;
                        reflectedLine = testReflectedLine;
                        isReflected = testWillBeReflected;
                    }
                }
            }
            if (thisHitSpr == null) {
                thisHitPoint = zz.pointIntersectionFromRectToLine(parentRect, lastLine);
            }
            this.drawLazerFromPoint(cc.p(lastLine.x, lastLine.y), thisHitPoint);
            lastHitSpr = thisHitSpr;
            if (isReflected) {
                lastLine = reflectedLine;
            } else {
                // if packet
                if (lastHitSpr) {
                    lastHitSpr.getHurt();
                }
                ended = true;
                this.drawSparkAtPoint(thisHitPoint, lastLine);
                // turn red if need
                turningRed = false;
                if (lastHitSpr) {
                    if (lastHitSpr.isClass("BaseSprite")) {
                        if (lastHitSpr.isType("FirePacket")) {
                            turningRed = true;
                        }
                    }
                }
            }
        }
    },
    drawLazerFromPoint:function(fromPoint, toPoint) {
        var fp = zz.pointOffset(fromPoint, -this.getPosition().x, -this.getPosition().y);
        var tp = zz.pointOffset(toPoint, -this.getPosition().x, -this.getPosition().y);
        var center = zz.centerFromPoints(fp, tp);
        var distance = zz.distanceFromPoints(fp, tp);
        var zRotation = atan2(fp.y - tp.y, fp.x - tp.x);

        var lazer = null;
        for (let i in this._cacheLines) {
            var li = this._cacheLines[i];
            if (li.getParent() == null) {
                lazer = li;
                break;
            }
        }
        if (lazer == null) {
            lazer = new BaseSprite("Textures/LazerParticle.png");
            lazer.setScaleY(0.4);
            this._cacheLines.push(lazer);
        }
        lazer.setRotation(zRotation);
        lazer.setPosition(center);
        lazer.setScaleX(distance / OBJ_BLOCK_WIDTH);
        this.tintLazerObjectIfNeed(lazer);
        this.addChild(lazer);
        // console.log("cachedLines:" + this._cacheLines.length);
    },
    drawSparkAtPoint:function(atPoint, fromLine) {
        var pointer2 = this._cacheSpark;
        pointer2.setRotation(fromLine.alpha + cc.randomMinus1To1() * M_PI * 0.1);
        pointer2.setPosition(zz.pointOffset(atPoint, -this.getPosition().x, -this.getPosition().y));
        pointer2.setScaleY(cc.randomMinus1To1() > 0 ? 1 : -1);
        this.tintLazerObjectIfNeed(pointer2);
        if (this._cacheSpark.getParent() == null) {
            this.addChild(pointer2);
        }  
    },
    tintLazerObjectIfNeed:function(object) {
        // return;

        // if (object) {
        //     object.updateDisplayedColor(this.getTintColor());
        // }
    },
    getTintColor:function() {
        if (turningRed) {
            return cc.color(200, 0, 0, 255);
        }
        return cc.color(0, 200, 200, 255);
    }
});