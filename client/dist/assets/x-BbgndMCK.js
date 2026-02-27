import{r as t,j as k}from"./index-BDmM9Gnj.js";import{M as b,u as z,P as A,a as $,b as S,L as V,c as g}from"./createLucideIcon-CCiIpJTS.js";class D extends t.Component{getSnapshotBeforeUpdate(l){const e=this.props.childRef.current;if(e&&l.isPresent&&!this.props.isPresent){const n=this.props.sizeRef.current;n.height=e.offsetHeight||0,n.width=e.offsetWidth||0,n.top=e.offsetTop,n.left=e.offsetLeft}return null}componentDidUpdate(){}render(){return this.props.children}}function H({children:i,isPresent:l}){const e=t.useId(),n=t.useRef(null),C=t.useRef({width:0,height:0,top:0,left:0}),{nonce:f}=t.useContext(b);return t.useInsertionEffect(()=>{const{width:d,height:o,top:h,left:s}=C.current;if(l||!n.current||!d||!o)return;n.current.dataset.motionPopId=e;const c=document.createElement("style");return f&&(c.nonce=f),document.head.appendChild(c),c.sheet&&c.sheet.insertRule(`
          [data-motion-pop-id="${e}"] {
            position: absolute !important;
            width: ${d}px !important;
            height: ${o}px !important;
            top: ${h}px !important;
            left: ${s}px !important;
          }
        `),()=>{document.head.removeChild(c)}},[l]),k.jsx(D,{isPresent:l,childRef:n,sizeRef:C,children:t.cloneElement(i,{ref:n})})}const K=({children:i,initial:l,isPresent:e,onExitComplete:n,custom:C,presenceAffectsLayout:f,mode:d})=>{const o=z(U),h=t.useId(),s=t.useCallback(u=>{o.set(u,!0);for(const x of o.values())if(!x)return;n&&n()},[o,n]),c=t.useMemo(()=>({id:h,initial:l,isPresent:e,custom:C,onExitComplete:s,register:u=>(o.set(u,!1),()=>o.delete(u))}),f?[Math.random(),s]:[e,s]);return t.useMemo(()=>{o.forEach((u,x)=>o.set(x,!1))},[e]),t.useEffect(()=>{!e&&!o.size&&n&&n()},[e]),d==="popLayout"&&(i=k.jsx(H,{isPresent:e,children:i})),k.jsx(A.Provider,{value:c,children:i})};function U(){return new Map}const v=i=>i.key||"";function P(i){const l=[];return t.Children.forEach(i,e=>{t.isValidElement(e)&&l.push(e)}),l}const B=({children:i,custom:l,initial:e=!0,onExitComplete:n,presenceAffectsLayout:C=!0,mode:f="sync",propagate:d=!1})=>{const[o,h]=$(d),s=t.useMemo(()=>P(i),[i]),c=d&&!o?[]:s.map(v),u=t.useRef(!0),x=t.useRef(s),y=z(()=>new Map),[T,I]=t.useState(s),[p,j]=t.useState(s);S(()=>{u.current=!1,x.current=s;for(let a=0;a<p.length;a++){const r=v(p[a]);c.includes(r)?y.delete(r):y.get(r)!==!0&&y.set(r,!1)}},[p,c.length,c.join("-")]);const M=[];if(s!==T){let a=[...s];for(let r=0;r<p.length;r++){const m=p[r],E=v(m);c.includes(E)||(a.splice(r,0,m),M.push(m))}f==="wait"&&M.length&&(a=M),j(P(a)),I(s);return}const{forceRender:R}=t.useContext(V);return k.jsx(k.Fragment,{children:p.map(a=>{const r=v(a),m=d&&!o?!1:s===p||c.includes(r),E=()=>{if(y.has(r))y.set(r,!0);else return;let w=!0;y.forEach(L=>{L||(w=!1)}),w&&(R==null||R(),j(x.current),d&&(h==null||h()),n&&n())};return k.jsx(K,{isPresent:m,initial:!u.current||e?void 0:!1,custom:m?void 0:l,presenceAffectsLayout:C,mode:f,onExitComplete:m?void 0:E,children:a},r)})})};/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=g("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=g("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=g("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=g("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);export{B as A,F as C,G as T,W as X,O as a};
