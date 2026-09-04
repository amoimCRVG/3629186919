// [COMBO] {"material":"Fill notch","combo":"FILLNOTCH","type":"options","default":0}
// [COMBO] {"material":"Invert corners","combo":"INVERT","type":"options","default":0}
// [COMBO] {"material":"Corner type","combo":"C_TYPE","type":"options","default":0,"options":{"Round":0,"45° cut":1,"Cutout square":2,"Cutout round":3,"Cutout square + 45° cut":4,"Cutout square + round":5,"Cutout square + square":6,"Cutout round + 45° cut":7,"Cutout round + round":8,"Cutout round + square":9,"45° cut + square":10,"45° cut + round":11,"Cutout square + external square":12,"Cutout round + external circle":13,"45° cut + external triangle":14}}
// [COMBO] {"material":"Blend transparency","combo":"C_TRANSPARENCY","type":"options","default":1,"options":{"ui_editor_blending_normal":0,"ui_editor_properties_replace":1,"ui_editor_blending_add":2,"ui_editor_properties_min":3,"ui_editor_blending_multiply":4,"Burn":5,"ui_editor_properties_max":6,"ui_editor_blending_screen":7,"Dodge":8,"ui_editor_blending_overlay":9,"ui_editor_blending_difference":10,"ui_editor_blending_exclusion":11,"ui_editor_blending_subtract":12,"ui_editor_blending_reflect":13,"ui_editor_blending_phoenix":14,"ui_editor_blending_average":15,"ui_editor_blending_negation":16}}
// [COMBO] {"material":"ui_editor_properties_blend_mode","combo":"BLENDMODE","type":"imageblending","default":0}
// [COMBO] {"material":"Reference resolution","combo":"REF_RES","type":"options","default":0}

#include "common_blending.h"

uniform sampler2D g_Texture0; // {"material":"framebuffer","label":"ui_editor_properties_framebuffer","hidden":true}
uniform sampler2D g_Texture1; // {"label":"ui_editor_properties_opacity","mode":"opacitymask","combo":"MASK","paintdefaultcolor":"0 0 0 1"}
uniform sampler2D g_Texture2; // {"material":"contentTexure","label":"Content","combo":"TEX"}
uniform sampler2D g_Texture3; // {"default":"_rt_FullFrameBuffer","hidden":true,"material":"backgroundTexture"}

uniform vec4 g_Texture0Resolution;
uniform vec2 u_FrameAlpha; // {"default":"0 1","group":"Alpha","label":"Frame","linked":true,"material":"frameAlpha","range":[0,1]}
uniform vec2 u_OutAlpha; // {"default":"0 0","group":"Alpha","label":"Outside","linked":true,"material":"outAlpha","range":[0,1]}
uniform vec2 u_InAlpha; // {"default":"0 0.3","group":"Alpha","label":"Inside","linked":true,"material":"insideAlpha","range":[0,1]}
uniform float u_opacity; // {"material":"ui_editor_properties_opacity","default":1,"range":[0,1]}
uniform float u_Softness; // {"material":"ui_settings_gfx_antialiasing","default":1,"range":[0,2]}
uniform float u_NotchSize; // {"material":"Notch size","default":0.5,"range":[0,2],"group":"Shape","order":1}
uniform float u_NotchSize2; // {"material":"Notch 2 offset","default":0.3,"range":[0,1],"group":"Shape","order":2}
uniform float u_Thickness; // {"material":"Thickness","default":0.1,"range":[0,1],"group":"Shape","order":3}
uniform float u_extrudeEdge; // {"material":"Edge extrude","default":0,"range":[0,1],"group":"Shape","order":4}
uniform float u_refResolution; // {"material":"Reference resolution","int":true,"default":512,"range":[0,2160]}
uniform vec3 u_InColor; // {"default":"0.3 0.3 0.3","group":"Color","label":"Inside","material":"inColor","type":"color"}
uniform vec3 u_FrameColor; // {"default":"1 1 1","group":"Color","label":"Frame","material":"frameColor","type":"color"}
uniform vec3 u_OutColor; // {"default":"0 0 0","group":"Color","label":"Outside","material":"outColor","type":"color"}
uniform float u_Notch1; // {"material":"Top left","default":1,"range":[0,1],"group":"Notches","order":1}
uniform float u_Notch2; // {"material":"Top right","default":1,"range":[0,1],"group":"Notches","order":2}
uniform float u_Notch3; // {"material":"Bottom right","default":1,"range":[0,1],"group":"Notches","order":4}
uniform float u_Notch4; // {"material":"Bottom left","default":1,"range":[0,1],"group":"Notches","order":3}
uniform vec2 u_size; // {"default":"1 1","group":"Transforms","linked":true,"material":"ui_editor_properties_size","range":[0,1]}

varying vec4 v_TexCoord; // xy = transformed coord, zw = uv
varying vec4 v_Size.xy; // xy = size, zw = alignment coord
varying vec3 v_Transform; // x = notch size, y = border thickness, z = extrude edge
varying vec2 v_ScreenCoord;

float BlendTransparency(const float base, const float blend, const float opacity){
	float transparency = base; //normal transparency
#if C_TRANSPARENCY == 1
	transparency = blend; //replace transparency
#endif
#if C_TRANSPARENCY == 2
	transparency = saturate(base + blend); //add transparency
#endif
#if C_TRANSPARENCY == 3
	transparency = min(base, blend); //Minimum transparency
#endif
#if C_TRANSPARENCY == 4
	transparency = base * blend; //multiply transparency
#endif
#if C_TRANSPARENCY == 5
	transparency = (blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0); //Burn transparency
#endif
#if C_TRANSPARENCY == 6
	transparency = max(base, blend); //Maximum transparency
#endif
#if C_TRANSPARENCY == 7
	transparency = 1.0 - (1.0 - base) * (1.0 - blend); //Screen transparency
#endif
#if C_TRANSPARENCY == 8
	transparency = (blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0); //Dodge transparency
#endif
#if C_TRANSPARENCY == 9
	transparency = base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)); //Overlay transparency
#endif
#if C_TRANSPARENCY == 10
	transparency = saturate(base - blend); //Difference transparency
#endif
#if C_TRANSPARENCY == 11
	transparency = base + blend - 2.0 * base + blend; //Exclusion transparency
#endif
#if C_TRANSPARENCY == 12
	transparency = saturate(base + blend - 1.0); //subtract transparency
#endif
#if C_TRANSPARENCY == 13
	transparency = (blend == 1.0) ? blend : min(base * base / (1.0 - blend), 1.0); //Reflect transparency
#endif
#if C_TRANSPARENCY == 14
	transparency = min(base, blend) - max(base, blend) + 1.0; //Phoenix transparency
#endif
#if C_TRANSPARENCY == 15
	transparency = (base + blend) / 2.0; //Average transparency
#endif
#if C_TRANSPARENCY == 16
	transparency = 1.0 - abs(1.0 - base - blend); //Negation transparency
#endif
	return mix(base, transparency, opacity);
}

float segmentSDF(vec2 p, vec2 a, vec2 b) {
	vec2 ba = b - a;
	vec2 pa = p - a;
	return ba.x * pa.y - ba.y * pa.x;
}

float boxSDF(vec2 p, vec2 origin, vec2 size) {
	vec2 d = abs(p - origin) - size;
	return max(d.x, d.y);
}

vec4 fourWayPairwiseMixEqual(
    vec4 c0, vec4 c1, vec4 c2, vec4 c3,
    float f01, float f02, float f03,
    float f12, float f13, float f23)
{
    // convert to premultiplied alpha
    vec4 p0 = vec4(c0.rgb * c0.a, c0.a);
    vec4 p1 = vec4(c1.rgb * c1.a, c1.a);
    vec4 p2 = vec4(c2.rgb * c2.a, c2.a);
    vec4 p3 = vec4(c3.rgb * c3.a, c3.a);

    // pairwise mixes (still premultiplied)
    vec4 m01 = mix(p0, p1, f01);
    vec4 m02 = mix(p0, p2, f02);
    vec4 m03 = mix(p0, p3, f03);
    vec4 m12 = mix(p1, p2, f12);
    vec4 m13 = mix(p1, p3, f13);
    vec4 m23 = mix(p2, p3, f23);

    // accumulate (equal weights for each pair)
    vec4 acc = (m01 + m02 + m03 + m12 + m13 + m23) / 6.0;

    // un-premultiply (handle zero alpha)
    if (acc.a <= 1e-6) return CAST4(0.0); // fully transparent
    return vec4(acc.rgb / acc.a, acc.a);
}

void main() {
	vec4 pix = texSample2D(g_Texture0, v_TexCoord.zw);

#if REF_RES
#define res u_refResolution
#else
#define res g_Texture0Resolution.xy
#endif

	float notchEnabled = v_TexCoord.x < 0.0 && v_TexCoord.y < 0.0 ? u_Notch1 : 0.0; // top-left
	notchEnabled = v_TexCoord.x > 0.0 && v_TexCoord.y < 0.0 ? u_Notch2 : notchEnabled; // top-right
	notchEnabled = v_TexCoord.x > 0.0 && v_TexCoord.y > 0.0 ? u_Notch3 : notchEnabled; // bottom-right
	notchEnabled = v_TexCoord.x < 0.0 && v_TexCoord.y > 0.0 ? u_Notch4 : notchEnabled; // bottom-left

	vec2 sdf = (abs(v_TexCoord.xy) - v_Size.xy - v_Transform.z);
	float notchSize = v_Transform.x * notchEnabled;
	float notch = 1.0;
#if C_TYPE == 0 // round
	notch = length(abs(v_TexCoord.xy) - v_Size.xy + notchSize - v_Transform.y) - notchSize + v_Transform.y; // compute curvature
	vec2 quadrant = v_TexCoord.xy - (v_Size.xy - (notchSize - v_Transform.y)) * sign(v_TexCoord.xy); // coordinates local to the circle
	notch = sign(v_TexCoord.x) == sign(quadrant.x) && sign(v_TexCoord.y) == sign(quadrant.y) ? notch : -1e5; // prevent cutting inside the frame
#endif
#if C_TYPE == 1 // 45° cut
	notch = segmentSDF(v_Size.xy - abs(v_TexCoord.xy), vec2(notchSize, 0.0), vec2(0.0, notchSize)) / (notchSize * 1.414214);
#endif
#if C_TYPE == 2 // Cutout square
	notch = -boxSDF(abs(v_TexCoord.xy) - v_Transform.y, v_Size.xy, CAST2(notchSize + v_Transform.y));
	#if INVERT
		notch = -notch;
	#endif
#endif
#if C_TYPE == 3 // Cutout round
	#if INVERT
		notch = length(abs(v_TexCoord.xy) - v_Size.xy) - notchSize;
	#else
		notch = -length(abs(v_TexCoord.xy) - v_Size.xy - v_Transform.y) + notchSize + v_Transform.y;
	#endif
#endif
#if C_TYPE == 4 // Cutout square + 45° cut
	notch = -boxSDF(abs(v_TexCoord.xy) - v_Transform.y, v_Size.xy, CAST2(notchSize + v_Transform.y));
	#if INVERT
		float offset = (1.0 - u_NotchSize2) * (notchSize + notchSize);
		notch = max(-notch, -segmentSDF(abs(v_TexCoord.xy) - v_Size.xy, vec2(notchSize + offset, 0.0), vec2(0.0, notchSize + offset)) / ((notchSize + offset) * 1.414214));
	#else
		float offset = (1.0 - u_NotchSize2) * notchSize;
		notch = min(notch, segmentSDF(v_Size.xy - abs(v_TexCoord.xy), vec2(notchSize + offset, 0.0), vec2(0.0, notchSize + offset)) / ((notchSize + offset) * 1.414214));
	#endif
#endif
#if C_TYPE == 5 // Cutout square + round
	notch = -boxSDF(abs(v_TexCoord.xy) - v_Transform.y, v_Size.xy, CAST2(notchSize + v_Transform.y));
	#if INVERT
		float offset = (0.5 - u_NotchSize2) * (notchSize + notchSize);
		notch = max(-notch, -length(abs(v_TexCoord.xy) - v_Size.xy - notchSize - (v_Transform.y + v_Transform.y)) + notchSize - offset);
	#else
		notch = min(notch, length(v_Size.xy - abs(v_TexCoord.xy) - notchSize) + (0.5 - u_NotchSize2) * notchSize - notchSize * 0.5);
	#endif
#endif
#if C_TYPE == 6 // Cutout square + square
	notch = -boxSDF(abs(v_TexCoord.xy) - v_Transform.y, v_Size.xy, CAST2(notchSize + v_Transform.y));
	#if INVERT
		float offset = (u_NotchSize2 - 0.03) * (notchSize + notchSize);
		notch = max(-notch, -boxSDF(abs(v_TexCoord.xy) - notchSize - (v_Transform.y + v_Transform.y), v_Size.xy, CAST2(offset)) + v_Transform.y);
	#else
		notch = min(notch, boxSDF(notchSize + abs(v_TexCoord.xy), v_Size.xy, CAST2(u_NotchSize2 * notchSize)));
	#endif
#endif
#if C_TYPE == 7 // Cutout round + 45° cut
	#if INVERT
		notch = length(abs(v_TexCoord.xy) - v_Size.xy) - notchSize;
		float offset = (0.5 - u_NotchSize2) * (notchSize + notchSize);
		notch = max(notch, -segmentSDF(abs(v_TexCoord.xy) - v_Size.xy, vec2(notchSize + offset, 0.0), vec2(0.0, notchSize + offset)) / ((notchSize + offset) * 1.414214));
	#else
		notch = -length(abs(v_TexCoord.xy) - v_Size.xy - v_Transform.y) + notchSize + v_Transform.y;
		float offset = (0.5 - u_NotchSize2) * notchSize;
		notch = min(notch, segmentSDF(v_Size.xy - abs(v_TexCoord.xy), vec2(notchSize + offset, 0.0), vec2(0.0, notchSize + offset)) / ((notchSize + offset) * 1.414214));
	#endif
#endif
#if C_TYPE == 8 // Cutout round + round
	#if INVERT
		notch = length(abs(v_TexCoord.xy) - v_Size.xy) - notchSize;
		float offset = -(u_NotchSize2 * 0.75 - 0.28) * (notchSize + notchSize);
		notch = max(notch, -length(abs(v_TexCoord.xy) - v_Size.xy - notchSize - v_Transform.y) + notchSize - offset + v_Transform.y);
	#else
		notch = -length(abs(v_TexCoord.xy) - v_Size.xy - v_Transform.y) + notchSize + v_Transform.y;
		notch = min(notch, length(v_Size.xy - abs(v_TexCoord.xy) - notchSize) - (u_NotchSize2 - 0.1) * 0.5 * notchSize - notchSize * 0.5);
	#endif
#endif
#if C_TYPE == 9 // Cutout round + square
	#if INVERT
		notch = length(abs(v_TexCoord.xy) - v_Size.xy) - notchSize;
		float offset = ((u_NotchSize2 + 0.24) * 0.75) * (notchSize + notchSize);
		notch = max(notch, -boxSDF(abs(v_TexCoord.xy) - notchSize - (v_Transform.y + v_Transform.y), v_Size.xy, CAST2(offset)) + v_Transform.y);
	#else
		notch = -length(abs(v_TexCoord.xy) - v_Size.xy - v_Transform.y) + notchSize + v_Transform.y;
		notch = min(notch, boxSDF(notchSize + abs(v_TexCoord.xy), v_Size.xy, CAST2((u_NotchSize2 * 0.75 + 0.25) * notchSize)));
	#endif
#endif
#if C_TYPE == 10 // 45° cut + square
	notch = segmentSDF(v_Size.xy - abs(v_TexCoord.xy), vec2(notchSize, 0.0), vec2(0.0, notchSize)) / (notchSize * 1.414214);
	#if INVERT
		notch = max(notch, -boxSDF(notchSize * 0.5 + abs(v_TexCoord.xy), v_Size.xy + v_Transform.y, CAST2(u_NotchSize2 * 0.5 * notchSize + v_Transform.y)));
	#else
		notch = min(notch, boxSDF(notchSize * 0.5 + abs(v_TexCoord.xy), v_Size.xy, CAST2(u_NotchSize2 * 0.5 * notchSize)));
	#endif
#endif
#if C_TYPE == 11 // 45° cut + round
	notch = segmentSDF(v_Size.xy - abs(v_TexCoord.xy), vec2(notchSize, 0.0), vec2(0.0, notchSize)) / (notchSize * 1.414214);
	#if INVERT
		notch = max(notch, -length(v_Size.xy - abs(v_TexCoord.xy) - notchSize * 0.5 + v_Transform.y) - (0.5 - u_NotchSize2 * 0.5) * notchSize + notchSize * 0.5 + v_Transform.y);
	#else
		notch = min(notch, length(v_Size.xy - abs(v_TexCoord.xy) - notchSize * 0.5) + (0.5 - u_NotchSize2 * 0.5) * notchSize - notchSize * 0.5);
	#endif
#endif
#if C_TYPE == 12 // Cutout square + external square
	notch = -boxSDF(abs(v_TexCoord.xy) - v_Transform.y, v_Size.xy, CAST2(notchSize + v_Transform.y));
	notch = min(notch, boxSDF(abs(v_TexCoord.xy) - (1.0 - u_NotchSize2) * 100.0, v_Size.xy, CAST2(notchSize)));
#endif
#if C_TYPE == 13 // Cutout round + external circle
	notch = -length(v_Size.xy - abs(v_TexCoord.xy) + v_Transform.y) + notchSize + v_Transform.y;
	notch = min(notch, length(v_Size.xy - abs(v_TexCoord.xy) + v_Transform.y) + (1.0 - u_NotchSize2) * 100 - v_Transform.y - notchSize);
#endif
#if C_TYPE == 14 // 45° cut + external triangle
	float offset = (1.0 - u_NotchSize2) * 100 + v_Transform.y * 1.414214;
	notch = segmentSDF(v_Size.xy - abs(v_TexCoord.xy), vec2(notchSize, 0.0), vec2(0.0, notchSize)) / (notchSize * 1.414214);
	notch = min(notch, -segmentSDF(v_Size.xy - abs(v_TexCoord.xy), vec2(notchSize - offset, 0.0), vec2(0.0, notchSize - offset)) / ((notchSize - offset) * 1.414214));
#endif

#if INVERT && C_TYPE != 0 && C_TYPE <= 9
	float edge = min(notch + v_Transform.y, max(sdf.x, sdf.y)); // combine rectangular frame with the notches
#else
	float edge = max(notch, max(sdf.x, sdf.y)); // combine rectangular frame with the notches
#endif
	float outside = 1.0, inside = 0.0;
#if !FILLNOTCH
	if (edge >= v_Transform.y) { // invert the edge for feather falloff (AA)
		edge = v_Transform.y - edge + u_Softness;
		outside = 0.0;
	}
	if (edge > u_Softness) outside = 0.0;
#else
	#if INVERT && C_TYPE != 0 && C_TYPE <= 9
	if (max(sdf.x, sdf.y) - u_Softness >= 0.0) { // invert the edge for feather falloff (AA)
		edge = -min(notch, max(sdf.x, sdf.y) - v_Transform.y) + u_Softness;
		outside = 0.0;
	} else edge = max(sdf.x, sdf.y);
	if (edge > u_Softness) outside = 0.0;
	#else
	if (max(sdf.x, sdf.y) - v_Transform.y >= 0.0) { // invert the edge for feather falloff (AA)
		edge = v_Transform.y - max(sdf.x, sdf.y) + u_Softness;
		outside = 0.0;
	}
	if (edge > u_Softness) outside = 0.0;
	#endif
#endif
	edge = saturate(smoothstep(-u_Softness, u_Softness, edge)); // draw frame with anti-aliasing


#if MASK
	float alpha = texSample2D(g_Texture1, v_TexCoord.zw).r * u_opacity;
#else
	float alpha = u_opacity;
#endif


	vec3 bg = texSample2D(g_Texture3, v_ScreenCoord * 0.5 + 0.5).rgb;
#if TEX
	vec4 tex = texSample2D(g_Texture2, saturate(v_Size.zw));
	float is_tex = step(max(abs(v_Size.z - 0.5), abs(v_Size.w - 0.5)), 0.5);
	vec3 content = mix(u_InColor, tex.rgb, is_tex * tex.a);
#else
#define content u_InColor
#endif

	// blend between property colors and layer color with primary alpha values
	vec3 outColor = mix(pix.rgb, u_OutColor, u_OutAlpha.x);
	vec3 inColor = mix(pix.rgb, content, u_InAlpha.x);
	vec3 frameColor = mix(pix.rgb, u_FrameColor, u_FrameAlpha.x);

	// blend everything with secondary alpha values
	vec4 outSmooth = mix(vec4(mix(bg, outColor, u_OutAlpha.y), 1.0), vec4(frameColor, u_FrameAlpha.y), edge);
	vec4 inSmooth = mix(vec4(mix(bg, inColor, u_InAlpha.y), 1.0), vec4(frameColor, u_FrameAlpha.y), edge);
	vec4 final = outside ? inSmooth : outSmooth;
	
	// apply blendings
	final.rgb = ApplyBlending(BLENDMODE, pix.rgb, final.rgb, alpha);
	final.a = BlendTransparency(pix.a, final.a, alpha);
	gl_FragColor = final;
}