function GameLoop(fps, fnOnFrame)
{
    this.mMillisecPerFrame = Math.floor(1000/fps);
    this.OnFrame = fnOnFrame;
}

GameLoop.prototype  = {
    Start : function ()
    {
        var startTime = Date.now();
        this.OnFrame();
        var endTime = Date.now();
        var delta = endTime - startTime;
        var __self = this;
        function __continue()
        {
            __self.Start();
        }
        if (delta >= this.mMillisecPerFrame)
        {
            setTimeout(__continue,0);
        }
        else
        {
            setTimeout(__continue,this.mMillisecPerFrame - delta);
        }
    }
}


function WorldPosition(position, rotationAxis, angle)
{
    this.mWorld = new M4x4.$();
    this.MakeTranslation(position);
}

WorldPosition.prototype = {
    MakeTranslation : function (position)
    {
        M4x4.makeTranslate(position, this.mWorld);
    },


    MakeRotation : function (axis, angle)
    {
        M4x4.makeRotate(angle, axis, this.mWorld, this.mWorld);
    },

    Rotate : function (axis, angle)
    {
        M4x4.rotate(angle, axis, this.mWorld, this.mWorld);
    },

    Translate : function (position)
    {
        M4x4.translate(position, this.mWorld);
    }


}

function RenderEntity(geometry, shader)
{
    this.mGeometry = geometry;
    this.mShader = shader;
    this.mState = new WorldPosition([0,0,0],[1,0,0],0);
}

RenderEntity.prototype = {
    BindUniforms : function(gl)
    {
        gl.uniformMatrix4fv(this.mShader.worldMatrixUniform, false, this.mState.mWorld);
    },

    Draw : function (gl)
    {
        gl.useProgram(this.mShader);
        this.BindUniforms(gl);
        this.mGeometry.DrawIndexes(gl, this.mShader);
    }
}


POSITION_ITEMS = 3;

function Geometry(gl, vertices, indexes)
{
    this.mVertices = new Float32Array(vertices);
    this.mVertices.stride = POSITION_ITEMS;
    this.mVertices.numItems = vertices.length / this.mVertices.stride; //3 coordinates
    this.mIndexes = new Uint16Array(indexes);
    this.mVertexBuffer = gl.createBuffer();
    this.mElementBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.mVertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mElementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.mIndexes, gl.STATIC_DRAW);
}

Geometry.prototype = {
    BindAttributes : function (gl, shader)
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexBuffer);
        gl.vertexAttribPointer(shader.vertexPositionAttribute, POSITION_ITEMS, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mElementBuffer);
    },

    DrawIndexes : function (gl, shader)
    {
        this.BindAttributes(gl, shader);
        gl.drawElements(gl.TRIANGLES, this.mIndexes.length, gl.UNSIGNED_SHORT, 0);
    }
}

function MiniWebGlRenderEngine(canvas, entitiesCallback)
{
    this.mCanvas = canvas;
    this.gl = canvas.getContext("experimental-webgl");
    this.gl.viewportWidth = canvas.width;
    this.gl.viewportHeight = canvas.height;
    this.mView = new M4x4.$();
    this.mProjection = new M4x4.$();
    this.mViewProjection = new M4x4.$();
    this.InitProjection();
    this.mGeometries = [];
    this.mEntities = [];
    this.mEntitiesCallback = entitiesCallback;
    this.mEntitiesCallback.OnInit(this.gl, this);
    this.CreateEntities();
}

MiniWebGlRenderEngine.prototype = {
    InitProjection : function ()
    {
        var aspect = (this.gl.viewportHeight / this.gl.viewportWidth);
        var ratio = 0.2;
        M4x4.makeFrustum(-1 * ratio, 1 * ratio,-aspect * ratio, aspect * ratio, 0.1, 400 , this.mProjection); 
    },

    UpdateCamera : function (camera)
    {
        //M4x4.makeLookAt([7.4,0,0], [-1,0,-1], [0,1,0], this.mView);
        M4x4.makeLookAt(camera.eye, camera.to, camera.up, this.mView);
        M4x4.mul(this.mProjection, this.mView, this.mViewProjection); 
    },

    SetShaderUniforms : function (shader)
    {
        this.gl.uniformMatrix4fv(shader.viewMatrixUniform, false, this.mView);
        this.gl.uniformMatrix4fv(shader.projectionMatrixUniform, false, this.mProjection);
        this.gl.uniformMatrix4fv(shader.viewProjectionMatrixUniform, false, this.mViewProjection);
    },

    CreateShader : function (vertexSrc, fragSrc)
    {
        var vertexShader = this._CreateGlShader(vertexSrc, "vertex");
        var fragShader = this._CreateGlShader(fragSrc, "fragment");
        if (vertexShader != null && fragShader != null)
        {
            var shaderProgram = this.gl.createProgram();
            this.gl.attachShader(shaderProgram, vertexShader); 
            this.gl.attachShader(shaderProgram, fragShader); 
            this.gl.linkProgram(shaderProgram);

            if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS))
            {
                alert("error linking shaders");
            }
            else
            {
                shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(shaderProgram, "aPosition");
                this.gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

                shaderProgram.worldMatrixUniform = this.gl.getUniformLocation(shaderProgram, "uWorld");
                shaderProgram.viewMatrixUniform = this.gl.getUniformLocation(shaderProgram, "uView");
                shaderProgram.projectionMatrixUniform = this.gl.getUniformLocation(shaderProgram, "uProjection");
                shaderProgram.viewProjectionMatrixUniform = this.gl.getUniformLocation(shaderProgram, "uViewProjection");
            }
            return shaderProgram;
        }
        return null;
    },

    CreateEntities : function ()
    {
        var entities = this.mEntitiesCallback.GetEntities();
        //entity 1 triangle
        for (var i = 0; i < entities.length; ++i) this.mEntities.push(entities[i]);
    },


    BeginScene : function ()
    {
        this.gl.viewport(0,0,this.gl.viewportWidth,this.gl.viewportHeight);
        this.gl.clearColor(0.0,0.0,0.0,0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.enable(this.gl.DEPTH_TEST);
    },


    _CreateGlShader : function (src, type)
    {
        var shader;
        if (type == "fragment")
        {
            shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        }
        else if (type == "vertex")
        {
            shader = this.gl.createShader(this.gl.VERTEX_SHADER);
        }

        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    },

    Render : function (camera)
    {
        this.BeginScene();
        this.UpdateCamera(camera);
        for (this.i = 0; this.i < this.mEntities.length; ++this.i) { this.gl.useProgram(this.mEntities[this.i].mShader); this.SetShaderUniforms(this.mEntities[this.i].mShader);
            this.mEntities[this.i].Draw(this.gl);
        }
    },
}

