/* ============================================================================
   Jersey fabric (approved 2026-11-08, idea-jersey v11): the team colour drawn as a dimpled jersey mesh with long diagonal
   folds and a soft wave rolling through it, on the GPU every frame. App.fabric(m, colour, alt) returns a <canvas class="fab-cv">;
   one shared loop paints every fab-cv on screen. Without WebGL2 the canvas stays empty and the colour behind it shows.
   ========================================================================== */
(function () {
"use strict";
/* design previews: ?pv=fab-team,fab-home,pnum turns on an unapproved treatment inside the Approvals phone frames only */
App.pv = new Set((new URLSearchParams(location.search).get('pv') || '').split(',').filter(Boolean));
App.pv.forEach(f => document.documentElement.classList.add('pv-' + f));  // pv-only CSS hooks (app/css/pv13.css)
/* &at=<selector> (Approvals previews): scroll the frame so the part under review is in view once it has drawn */
(function () { let at = new URLSearchParams(location.search).get('at'); if (!at) return; let n = 0;
  // a trailing '!c' centres the element instead (for things a pinned bar would cover)
  const c = at.endsWith('!c'); if (c) at = at.slice(0, -2);
  const t = setInterval(() => { const el = document.querySelector(at); if (el) { el.scrollIntoView({ block: c ? 'center' : 'start' }); } if (el && ++n > 3 || n > 40 && !el) clearInterval(t); if (!el) n++; }, 400); })();
/* Jersey cloth (v8): the v3 fabric drawn by a WebGL2 shader every frame. A still layer of long diagonal folds, and a soft wave
   whose crests run along those folds and roll slowly across them, the crests bending a little and fading in and out along their
   length. Lit from the top left and soft-lit over the team colour; the dimpled mesh shifts with the slope as each crest passes. */
App.fabric = (() => { let on = false; const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const FS = `#version 300 es
precision highp float;out vec4 O;uniform vec2 R;uniform float D,T0;uniform vec3 C,C2;uniform vec4 M;uniform float SS,G;float T;
vec3 h3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return -1.+2.*fract(sin(p)*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(mix(dot(h3(i),f),dot(h3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(h3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(h3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
             mix(mix(dot(h3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(h3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(h3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(h3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);}
const float A=-.2793;mat2 ro(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
float H(vec2 p){vec2 u=ro(A)*p;
  float f=n3(vec3(u.x*.002,u.y*.013,.5))+.33*n3(vec3(u.x*.004,u.y*.026,7.5));
  float s=u.y+14.*sin(u.x/190.+T*.6)+12.*n3(vec3(u.x/260.,u.y/400.,T*.15));
  float e=.65+.5*n3(vec3(u.x/240.-T*.25,u.y/320.,T*.1+4.));
  float w=e*(sin(6.2832*s/M.z-T*1.6)+.35*sin(6.2832*s/(M.z*.5)-T*2.7+1.3));
  return M.w*f+M.y*w;}
vec4 dim(vec2 v){float r=1.05,l=length(v);vec2 g=vec2(-.252,-.336);float t=length(v-g)/1.47;
  vec4 c=t<.55?mix(vec4(0,0,0,.3),vec4(0,0,0,.12),t/.55):t<.8?mix(vec4(0,0,0,.12),vec4(1,1,1,.05),(t-.55)/.25):mix(vec4(1,1,1,.05),vec4(1,1,1,.22),clamp((t-.8)/.2,0.,1.));
  c.a*=smoothstep(r+.25,r-.25,l);return c;}
vec4 mesh(vec2 p){vec2 x=ro(-A)*p/1.35,t=vec2(5.,4.4);vec2 a=mod(x-vec2(1.25,1.1)+t*.5,t)-t*.5,b=mod(x-vec2(3.75,3.3)+t*.5,t)-t*.5;return dim(length(a)<length(b)?a:b);}
float sl(float b,float s){return s<=.5?b-(1.-2.*s)*b*(1.-b):b+(2.*s-1.)*((b<=.25?((16.*b-12.)*b+4.)*b:sqrt(b))-b);}
void main(){T=T0*M.x;vec2 p=vec2(gl_FragCoord.x,R.y*D-gl_FragCoord.y)/D;
  float h=H(p);vec2 dh=vec2(dFdx(h),-dFdy(h))*D;
  vec3 N=normalize(vec3(-SS*dh.x,-SS*dh.y,1.)),L=vec3(-.4967,-.7094,.5);
  float s=clamp(max(dot(N,L),0.)*1.9-.55,0.,1.);
  float w=R.x+R.y+500.,b=dot(p,vec2(.82,.57))-(mod(T*70.,w)-250.);s=clamp(s+M.w*exp(-b*b/2600.),0.,1.);
  vec3 base=mix(C,C2,G*smoothstep(.42,1.,p.y/R.y));
  vec4 m=mesh(p+N.xy*7.);vec3 c=mix(base,m.rgb,m.a);
  vec3 o=vec3(sl(c.r,s),sl(c.g,s),sl(c.b,s));
  float k=1.-smoothstep(.02,.12,dot(C,vec3(.2126,.7152,.0722)));
  o+=k*(.1*s+.2*smoothstep(.3,.85,s)+.07*m.a*step(.5,m.r));
  O=vec4(o,1.);}`;
  function init(cv) { const gl = cv.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true }); if (!gl) { cv.style.visibility = 'hidden'; return cv._gl = false; }
    // too many live canvases (e.g. a page of phone previews): the browser drops the oldest; hide it so the team colour behind shows, not a blank
    cv.addEventListener('webglcontextlost', () => { cv.style.visibility = 'hidden'; cv._gl = false; });
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o)); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0,1);}')); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const cs = getComputedStyle(cv.parentNode), rgb = (k, f) => { const n = parseInt(((cv.dataset[k] || cs.getPropertyValue('--' + k)).trim().replace('#', '') || f), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => v / 255); };
    const U = k => gl.getUniformLocation(pr, k), m = (cv.dataset.m || '1,.12,0,0,60,0').split(',').map(Number);
    gl.uniform3f(U('C'), ...rgb('c', 'e31837')); gl.uniform3f(U('C2'), ...rgb('alt', 'ffb81c')); gl.uniform4f(U('M'), m[0], m[1], m[2], m[3]); gl.uniform1f(U('SS'), m[4]); gl.uniform1f(U('G'), m[5]);
    cv._u = { R: U('R'), D: U('D'), T: U('T0') }; cv.classList.add('on'); return cv._gl = gl; }
  function paint(cv, t) { const gl = cv._gl ?? init(cv); if (!gl) return; const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(r.width * d), h = Math.round(r.height * d); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h); gl.uniform2f(cv._u.R, r.width, r.height); gl.uniform1f(cv._u.D, d); gl.uniform1f(cv._u.T, t); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function tick(now) { requestAnimationFrame(tick); const t = RM.matches ? 4 : now / 1000;
    document.querySelectorAll('canvas.fab-cv').forEach(cv => { const r = cv.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > innerHeight || (RM.matches && cv._still)) return; paint(cv, t); cv._still = RM.matches; }); }
  // m = speed, wave height, wavelength (px), still-fold weight, light depth, gradient to the second colour
  return (m = '', c = '', alt = '') => { if (!on) { on = true; requestAnimationFrame(tick); }
    return `<canvas class="fab-cv" aria-hidden="true"${m ? ` data-m="${m}"` : ''}${c ? ` data-c="${c}"` : ''}${alt ? ` data-alt="${alt}"` : ''}></canvas>`; }; })();
})();
