
// [COMBO] {"material":"Transparency","combo":"TRANSPARENCY","type":"options","default":4,"options":{"Preserve original":0,"Replace original":1,"Add to original":2,"Subtract from original":3,"Intersect original":4,"Fully opaque":5}}
// [COMBO] {"material":"Soft Edge","combo":"SOFT","type":"options","default":0}
// [COMBO] {"material":"Hollow (Larger border width require larger radius)","combo":"HOLLOW","type":"options","default":0}
// [COMBO] {"material":"Soft Edge Direction","combo":"SEDIRECTION","type":"options","default":0,"options":{"Inside":0,"Outside":1,"Both":2}}
// [COMBO] {"material":"ui_editor_properties_blend_mode","combo":"BLENDMODE","type":"imageblending","default":0}
// [COMBO] {"material":"Transparency only","combo":"C_ALPHA_ONLY","type":"options","default":1}
// [COMBO] {"material":"Invert opacity","combo":"INVERT","type":"options","default":0}

#include "common_blending.h"
uniform sampler2D g_Texture0; // {"material":"previous","label":"Prev","hidden":true}
uniform sampler2D g_Texture2; // {"combo":"OPACITYMASK","default":"util/white","label":"Radius Mask (Please disable \"Transform\" when editing)","mode":"opacitymask","paintdefaultcolor":"0 0 0 1"}

uniform vec3 u_Color; // {"default":"1 1 1","material":"Color","type":"color"}
uniform vec4 g_Texture0Resolution;
uniform float u_Radius; // {"material":"Radius","default":0.5,"range":[0.001,1]}
uniform float u_BorderWidth; // {"material":"Border width","default":0.025,"range":[0,0.25]}
uniform float u_Softness; // {"material":"Softness","int":false,"default":0.5,"range":[0,2]}
uniform float u_Alpha; // {"material":"ui_editor_properties_opacity","int":false,"default":1,"range":[0,1]}

varying vec2 p_TexCoord;
varying vec4 v_TexCoord;
varying vec2 v_Size;


float roundedBoxSDF(vec2 CenterPosition, vec2 size, float radius) {
    size *= 0.5;
    float r = radius * min(size.x, size.y);
    return length(max(abs(CenterPosition) - size + r, 0.0)) - r;
}

float roundedHollowBoxSDF(vec2 CenterPosition, vec2 size, float radius) {
    size *= 0.5;
    float r = (radius) * min(size.x, size.y) - u_BorderWidth;
    return length(max(abs(CenterPosition) - (size - u_BorderWidth) + r, 0.0)) - r;
}


void main() {
    vec4 pix = texSample2D(g_Texture0, p_TexCoord);
#if OPACITYMASK
#if TRANSFORM
    float radius = texSample2D(g_Texture2, v_TexCoord.zw).r;
#else
    float radius = texSample2D(g_Texture2, p_TexCoord).r;
#endif
#if HOLLOW == 1
    float d = roundedHollowBoxSDF(v_TexCoord.xy - vec2(0.5, 0.5), v_Size, radius);
#else
    float d = roundedBoxSDF(v_TexCoord.xy - vec2(0.5, 0.5), v_Size, radius);
#endif
#else
#if HOLLOW == 1
    float d = roundedHollowBoxSDF(v_TexCoord.xy - vec2(0.5, 0.5), v_Size, u_Radius);
#else
    float d = roundedBoxSDF(v_TexCoord.xy - vec2(0.5, 0.5), v_Size, u_Radius);
#endif
#endif
#if SOFT == 0
#if HOLLOW == 1
    float rAlpha = 1.0 - step(0, abs(d) - u_BorderWidth);
#else
    float rAlpha = 1.0 - step(0, d);
#endif
#else
#if SEDIRECTION == 0
    float edgeSoftnessI = u_Softness / max(g_Texture0Resolution.x, g_Texture0Resolution.y) * 2;
    float edgeSoftnessO = 0;
#endif
#if SEDIRECTION == 1
    float edgeSoftnessI = 0;
    float edgeSoftnessO = u_Softness / max(g_Texture0Resolution.x, g_Texture0Resolution.y) * 2;
#endif
#if SEDIRECTION == 2
    float edgeSoftnessI = u_Softness / max(g_Texture0Resolution.x, g_Texture0Resolution.y);
    float edgeSoftnessO = edgeSoftnessI;
#endif
#if HOLLOW == 1
    float rAlpha = 1.0 - smoothstep(-edgeSoftnessI, edgeSoftnessO, abs(d) - u_BorderWidth);
#else
    float rAlpha = 1.0 - smoothstep(-edgeSoftnessI, edgeSoftnessO, d);
#endif
#endif
#if TRANSPARENCY == 0
    float alpha = pix.a;
#endif
#if TRANSPARENCY == 1
    float alpha = rAlpha * u_Alpha;
#endif
#if TRANSPARENCY == 2
    float alpha = max(pix.a, rAlpha * u_Alpha);
#endif
#if TRANSPARENCY == 3
    float alpha = max(0.0, pix.a - rAlpha * u_Alpha);
#endif
#if TRANSPARENCY == 4
    float alpha = pix.a * rAlpha * u_Alpha;
#endif
#if TRANSPARENCY == 5
    float alpha = u_Alpha;
#endif

#if INVERT
    alpha = 1 - alpha;
#if C_ALPHA_ONLY == 0
    rAlpha = 1 - rAlpha;
#endif
#endif

#if C_ALPHA_ONLY
    gl_FragColor = vec4(pix.rgb, alpha);
#else
    gl_FragColor = vec4(ApplyBlending(BLENDMODE, u_Color, mix(u_Color, pix.rgb, pix.a), alpha), rAlpha);
#endif
}