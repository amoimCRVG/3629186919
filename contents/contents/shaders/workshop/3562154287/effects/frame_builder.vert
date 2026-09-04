// [COMBO] {"material":"Fix aspect ratio","combo":"FIXSCALE","type":"options","default":1}
// [COMBO] {"material":"Fixed resolution","combo":"REF_RES","type":"options","default":0}
// [COMBO] {"material":"Corner type","combo":"C_TYPE","type":"options","default":0,"options":{"Round":0,"45° cut":1,"Cutout square":2,"Cutout round":3,"Cutout square + 45° cut":4,"Cutout square + round":5,"Cutout square + square":6,"Cutout round + 45° cut":7,"Cutout round + round":8,"Cutout round + square":9,"45° cut + square":10,"45° cut + round":11,"Cutout square + external square":12,"Cutout round + external circle":13,"45° cut + external triangle":14}}
// [COMBO] {"material":"Content alignment","combo":"D_ALIGNMENT","type":"options","default":1,"options":{"ui_browse_properties_alignment_cover":0,"ui_browse_properties_alignment_fill":1,"ui_browse_properties_alignment_center":2,"ui_browse_properties_alignment_stretch":3,"ui_browse_properties_alignment_free":4}}
// [COMBO] {"material":"Scale corners","combo":"SCALECORNERS","type":"options","default":0}

#include "common.h"

uniform sampler2D g_Texture2; // {"material":"contentTexure","label":"Content","combo":"TEX"}

uniform vec2 u_size; // {"default":"1 1","group":"Transforms","linked":true,"material":"ui_editor_properties_size","range":[0,1]}
uniform vec2 u_position; // {"default":"0 0","group":"Transforms","linked":true,"material":"ui_editor_properties_position","range":[-1,1]}
uniform float u_Thickness; // {"material":"Thickness","default":0.1,"range":[0,1],"group":"Shape","order":3}
uniform float u_Softness; // {"material":"ui_settings_gfx_antialiasing","default":1,"range":[0,2]}
uniform vec2 u_refResolution; // {"default":"512 512","material":"Reference resolution"}
uniform float u_NotchSize; // {"material":"Notch size","default":0.5,"range":[0,2],"group":"Shape","order":1}
uniform float u_extrudeEdge; // {"material":"Edge extrude","default":0,"range":[0,1],"group":"Shape","order":4}
uniform float u_rotation; // {"material":"ui_editor_properties_rotation","default":0,"direction":true,"conversion":"rad2deg","group":"Transforms"}
uniform vec2 u_texturePos; // {"default":"0 0","group":"Content texture","label":"ui_editor_properties_origin","material":"1textureOffset"}
uniform vec2 u_textureScale; // {"default":"1 1","group":"Content texture","label":"ui_editor_properties_scale","material":"2textureScale"}
uniform float u_texOffset; // {"default":"0","group":"Content texture","label":"ui_editor_properties_offset","material":"1texOffset","range":[-1,1]}
uniform vec2 u_texOffset2; // {"default":"0 0","group":"Content texture","label":"ui_editor_properties_offset","linked":true,"material":"1texOffset","range":[-1,1]}
uniform float u_textureAngle; // {"material":"3textureAngle","label":"ui_editor_properties_angle","default":0,"range":[0,6.28],"direction":true,"conversion":"rad2deg","group":"Content texture"}

uniform mat4 g_ModelViewProjectionMatrix;
uniform mat4 g_LayerModelMatrix;
uniform mat4 g_EffectModelViewProjectionMatrix;
uniform vec4 g_Texture0Resolution;
uniform vec4 g_Texture2Resolution;

attribute vec3 a_Position;
attribute vec2 a_TexCoord;

varying vec4 v_TexCoord; // xy = transformed coord, zw = uv
varying vec4 v_Size; // xy = size, zw = alignment coord
varying vec3 v_Transform; // x = notch size, y = border thickness, z = extrude edge
varying vec2 v_ScreenCoord;

void main() {
	v_TexCoord.zw = a_TexCoord;
	v_TexCoord.xy = a_TexCoord;

	v_ScreenCoord = mul(vec4((a_Position), 1.0), g_EffectModelViewProjectionMatrix).xy;
#if HLSL
	v_ScreenCoord.y = -v_ScreenCoord.y;
#endif

#if FIXSCALE
	// retrieve scale from the transformation matrix
	vec2 right = vec2(g_LayerModelMatrix[0][0], g_LayerModelMatrix[0][1]);
	vec2 up = vec2(g_LayerModelMatrix[1][0], g_LayerModelMatrix[1][1]);
	vec2 scale = vec2(length(right), length(up)); // layer scale
#else
#define scale CAST2(1.0)
#endif

#if REF_RES
#define res u_refResolution
#else
#define res g_Texture0Resolution.xy
#endif

	// convert percentage based property values to pixels
	v_Transform.x = max(1e-6, u_NotchSize * res.x * 0.2); // corner size
#if C_TYPE == 0 || C_TYPE == 7 || C_TYPE == 8 || C_TYPE == 9 || C_TYPE == 10 || C_TYPE == 11 || C_TYPE == 13
	v_Transform.x = length(CAST2(v_Transform.x)); // for non-square shapes
#endif
#if SCALECORNERS
	v_Transform.x *= min(scale.x * u_size.x, scale.y * u_size.y);
#endif
	v_Transform.y = u_Thickness * res.x * 0.05; // corner thickness
	v_Transform.z = u_extrudeEdge * res.x * 0.1; // edge extrusion

	v_TexCoord.xy = rotateVec2((v_TexCoord.xy + u_position - 0.5) * res * scale, u_rotation); // negate scale (if enabled) and apply transformations
	v_Size.xy = u_size * res * 0.5 * scale - v_Transform.y - u_Softness - u_Softness; // negate scale (if enabled) and add padding for borders and AA

	// ALIGNMENT
	float padding = u_Softness + u_Softness + v_Transform.y + v_Transform.y;
	vec2 res0 = res * scale * u_size - padding;

	float ratio0 = res0.x / res0.y;
	float ratio1 = g_Texture2Resolution.x / g_Texture2Resolution.y;
	float horizontal = step(ratio0, ratio1);
	vec2 ratio = mix(vec2(1.0, ratio1 / ratio0), vec2(ratio0 / ratio1, 1.0), D_ALIGNMENT == int(1) ? 1.0 - horizontal : horizontal);

#if D_ALIGNMENT == 0 //Cover
	v_Size.zw = v_TexCoord.xy / res0 * ratio + 0.5;

	float S = max(res0.x / g_Texture2Resolution.x, res0.y / g_Texture2Resolution.y);
	vec2 excessSize = (g_Texture2Resolution.xy * S - res0) / res0;

	v_Size.zw += excessSize * u_texOffset * ratio * 0.5;
#endif

#if D_ALIGNMENT == 1 //Fill
	v_Size.zw = v_TexCoord.xy / res0 * ratio + 0.5;

	float S = min(res0.x / g_Texture2Resolution.x, res0.y / g_Texture2Resolution.y);
	vec2 excessSize = (res0 - g_Texture2Resolution.xy * S) / res0;

	v_Size.zw += excessSize * u_texOffset * ratio * 0.5;
#endif

#if D_ALIGNMENT == 2 //Center
	v_Size.zw = v_TexCoord.xy / g_Texture2Resolution.xy / min(scale.x, scale.y) + 0.5;

	vec2 excessSize = (res0 / min(scale.x, scale.y) - g_Texture2Resolution.xy) / g_Texture2Resolution.xy * 0.5;

	v_Size.zw += excessSize * vec2(-u_texOffset2.x, u_texOffset2.y);
#endif

#if D_ALIGNMENT == 3 //Stretch
	v_Size.zw = v_TexCoord.xy / res0 + 0.5;
#endif

#if D_ALIGNMENT == 4 //Free
	v_Size.zw = v_TexCoord.xy / g_Texture2Resolution.xy / u_textureScale + 0.5;

	vec2 excessSize = res0 / (g_Texture2Resolution.xy * u_textureScale) * 0.5;

	v_Size.zw += excessSize * vec2(-u_texOffset2.x, u_texOffset2.y);
	v_Size.zw = rotateVec2(v_Size.zw - 0.5, -u_textureAngle) + 0.5;
#endif

	gl_Position = mul(vec4(a_Position, 1.0), g_ModelViewProjectionMatrix);
}