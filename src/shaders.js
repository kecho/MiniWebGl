TDLINER_SHADERS = {
    Vertex : 
        "attribute vec3 aPosition;\n" +
        "uniform mat4 uWorld;\n" +
        "uniform mat4 uView;\n" +
        "uniform mat4 uProjection;\n" +
        "uniform mat4 uViewProjection;\n" +
        "uniform float uRedDotLocation;\n"+
        "varying vec3 vWorldPos;\n"+
        "void main () {\n" +
        "   vec4 pos = (uWorld * vec4(aPosition, 1.0));\n"+
        "   vWorldPos = pos.xyz / pos.w;\n"+
        "   gl_Position = uViewProjection * uWorld * vec4(aPosition, 1.0);\n"+
        "}"
    ,
    Pixel : 
        "precision mediump float;\n"+
        "varying vec3 vWorldPos;\n"+
        "uniform float uRedDotLocation;\n"+
        "void main() {\n" +
        "   float colorDot = step(abs((vWorldPos.x) - uRedDotLocation), 0.2);\n"+
        "   vec3 finalColor = vec3(0.6,0.6,0.5) * colorDot;\n"+
        "   gl_FragColor = vec4(finalColor,1.0);\n"+
        "}\n"

}
