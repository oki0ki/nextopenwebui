import{E as b,F as l}from"./D9SVQgED.js";function C(t){return--t*t*((1.70158+1)*t+1.70158)+1}function $(t){const s=t-1;return s*s*s+1}function S(t,{delay:s=0,duration:o=400,easing:c=b}={}){const a=+getComputedStyle(t).opacity;return{delay:s,duration:o,easing:c,css:r=>`opacity: ${r*a}`}}function O(t,{delay:s=0,duration:o=400,easing:c=$,x:a=0,y:r=0,opacity:e=0}={}){const n=getComputedStyle(t),i=+n.opacity,u=n.transform==="none"?"":n.transform,y=i*(1-e),[p,f]=l(a),[d,g]=l(r);return{delay:s,duration:o,easing:c,css:(m,_)=>`
			transform: ${u} translate(${(1-m)*p}${f}, ${(1-m)*d}${g});
			opacity: ${i-y*_}`}}function U(t,{delay:s=0,duration:o=400,easing:c=$,start:a=0,opacity:r=0}={}){const e=getComputedStyle(t),n=+e.opacity,i=e.transform==="none"?"":e.transform,u=1-a,y=n*(1-r);return{delay:s,duration:o,easing:c,css:(p,f)=>`
			transform: ${i} scale(${1-u*f});
			opacity: ${n-y*f}
		`}}export{O as a,C as b,$ as c,S as f,U as s};
