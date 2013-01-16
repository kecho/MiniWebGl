
function getRandomThreshold(division)
{
    var r = Math.random();
    return r * (division.max - division.min) + division.min;
}


function push_vertex(vertex, list)
{
    for (var i = 0; i < vertex.length; ++i) 
    {
        list.push(vertex[i]);
    }
}

function createLineGeometry(lineList, lineLength, lineThickness)
{
    var thicknessHalf = lineThickness / 2;
    var vertices = [
        0, thicknessHalf, 0,
        0, - thicknessHalf, 0
    ];
    var indeces = [];
    var currentIndex = 2;
    var currentJump = 0;
    var currentLen = 0;
    for (var i = 0; i < lineList.length; ++i)
    {
        var segment = lineList[i];
        currentLen += segment.len;
        if (i < lineList.length - 1)
        {
            var turnsUp = segment.jump > 0;
            if (turnsUp)
            {   
                push_vertex([currentLen - lineThickness, currentJump + thicknessHalf, 0 ], vertices);
                push_vertex([currentLen, currentJump - thicknessHalf, 0], vertices);

            }
            else
            {
                push_vertex([currentLen, currentJump + thicknessHalf, 0 ], vertices);
                push_vertex([currentLen - lineThickness, currentJump - thicknessHalf, 0], vertices);
            }
        }
        else
        {
            push_vertex([currentLen, currentJump + thicknessHalf, 0 ], vertices);
            push_vertex([currentLen, currentJump - thicknessHalf, 0], vertices);
        }

        indeces.push(currentIndex - 2);
        indeces.push(currentIndex - 1);
        indeces.push(currentIndex);
        indeces.push(currentIndex - 1);
        indeces.push(currentIndex + 1);
        indeces.push(currentIndex);
        currentIndex += 2;
        currentJump += segment.jump;
        
        if (i < lineList.length - 1)
        {
            var turnsUp = segment.jump > 0;
            if (turnsUp)
            {
                push_vertex([currentLen - lineThickness, currentJump + thicknessHalf, 0], vertices);
                push_vertex([currentLen, currentJump - thicknessHalf, 0], vertices);
                indeces.push(currentIndex - 2);
                indeces.push(currentIndex - 1);
                indeces.push(currentIndex);
                indeces.push(currentIndex - 1);
                indeces.push(currentIndex + 1);
                indeces.push(currentIndex);
                currentIndex += 2;
            }
            else
            {
                push_vertex([currentLen,currentJump+thicknessHalf, 0], vertices);
                push_vertex([currentLen - lineThickness, currentJump - thicknessHalf, 0], vertices);
                indeces.push(currentIndex - 2);
                indeces.push(currentIndex - 1);
                indeces.push(currentIndex);
                indeces.push(currentIndex - 1);
                indeces.push(currentIndex + 1);
                indeces.push(currentIndex);
                currentIndex += 2;
            }

        }
    }

    return {v : vertices, i: indeces };
}


function createRandomLineGeometry(
    lineLength,
    divisionRange,
    divisionWidthRange,
    lineThickness
)
{
    var currentLength = lineLength;
    var lineList = [];
    while (currentLength > 0)
    {
        var value = getRandomThreshold(divisionRange);    
        value = Math.min(value, currentLength);
        currentLength -= value;
        var widthJump = getRandomThreshold(divisionWidthRange);
        lineList.push( {len : value, jump : widthJump});
    }

    return createLineGeometry(lineList, lineLength, lineThickness);
}

function TdEntityCallback(config)
{
    this.config = config;
    this.mLines = [];
    this.mEntities = [];
    this.mGeometries = [];
}

TdEntityCallback.prototype = {
    Append : function(src, target)
    {
        for (this.i = 0; this.i < src.length; ++this.i)
        {
            target.push(src[this.i]);
        }
    },
    OnInit : function (gl, shaderCreator)
    {
        var lineShader = shaderCreator.CreateShader(TDLINER_SHADERS.Vertex, TDLINER_SHADERS.Pixel);
        lineShader.dotLocation = gl.getUniformLocation(lineShader, "uRedDotLocation");

        for (var i = 0; i < this.config.lineGeometryTypes; ++i)
        {

            var rawGeom = createRandomLineGeometry(
                    this.config.lineGeneration.length,
                    this.config.lineGeneration.divisions,
                    this.config.lineGeneration.verticalJumps,
                    this.config.lineGeneration.width 
            );

            var geometry = new Geometry(gl, rawGeom.v, rawGeom.i);
            this.mGeometries.push(geometry);
        }



        for (var i = 0; i < this.config.lineEntities; ++i)
        {
            this.mLines.push(new RenderEntity(this.mGeometries[i % this.config.lineGeometryTypes], lineShader));
        }

        this.Append(this.mLines, this.mEntities);
    },

    GetEntities : function ()
    {
        return this.mEntities;
    }
}

function TdLinerSim(entityCallback)
{
    this.mEntityCallback = entityCallback;
    this.translationTmp = new V3.$();
    this.angleTmp = 0;
    this.config = this.mEntityCallback.config;
    this.i = 0;
    this.time = 0;
    this.dotTime = 0;
}

TdLinerSim.prototype = 
{
    OnSim : function (gl)
    {
        for (this.i = 0; this.i < this.mEntityCallback.mLines.length; ++this.i)
        {
            var line = this.mEntityCallback.mLines[this.i];
            this.config = this.mEntityCallback.config;
            //compute position on the zy planem where we draw a cilinder
            //y
            //|
            //|
            //|
            //---------z
            this.angleTmp = (this.i / this.config.lineEntities) * 2 * Math.PI + this.time*2*Math.PI;
            this.translationTmp[2] = this.config.sideOffset + this.config.radius * Math.cos(this.angleTmp);
            this.translationTmp[1] = this.config.radius * Math.sin(this.angleTmp);
            this.translationTmp[0] = this.config.depthOffset;
            
            //line.mState.MakeTranslation(this.translationTmp);
            line.mState.MakeRotation([1,0,0], -this.angleTmp);
            line.mState.mWorld[12] = this.translationTmp[0]; 
            line.mState.mWorld[13] = this.translationTmp[1];
            line.mState.mWorld[14] = this.translationTmp[2];

            gl.useProgram(line.mShader);
            gl.uniform1f(line.mShader.dotLocation, this.dotTime);
             
        }
        this.time += this.config.timeOffset;
        this.dotTime -= this.config.timeOffset * 1050;
        if (this.dotTime < -40)
        {
            this.dotTime = -40.0 - this.dotTime;
        }
    }
}

var gLoop;
var gMiniRender;
var gSim;

var gAppConfiguration = {
    timeOffset : 0.00004,
    radius : 0.5,
    depthOffset : -10,
    sideOffset : 0,
    lineEntities : 40,
    lineGeometryTypes : 5,
    lineGeneration : {
            length : 60,
            divisions : {min: 0.15, max: 0.2},
            verticalJumps : {min: -0.2, max: 0.2, minabs:0.3},
            width : 0.015 
    }
}

var gCamera = {
    eye : [-9.4, 0, -0.6],
    to : [1, 0, 1],
    up : [0, 1, 0]
}

function tdliner(canvasName)
{
    var canvas = document.getElementById(canvasName);
    gLoop = new GameLoop(60/*fps*/, OnTdLinerFrame);
    //try {
        var entityCallback = new TdEntityCallback(gAppConfiguration);
        gMiniRender = new MiniWebGlRenderEngine(canvas, entityCallback);
        gSim = new TdLinerSim(entityCallback);
        gLoop.Start();
   // } catch (e) {
    //    alert(e);
        /* handle in case web gl doesn't exist */
   // }
}


function OnTdLinerFrame()
{
    gSim.OnSim(gMiniRender.gl);
    gMiniRender.Render(gCamera);
}
