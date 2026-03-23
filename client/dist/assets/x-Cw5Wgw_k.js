import{r as t,j as g}from"./index-BZUT8zIQ.js";import{M as A,u as w,P as T,a as $,b as S,L as D,c as z}from"./createLucideIcon-Baifk3Nb.js";class K extends t.Component{getSnapshotBeforeUpdate(l){const e=this.props.childRef.current;if(e&&l.isPresent&&!this.props.isPresent){const n=this.props.sizeRef.current;n.height=e.offsetHeight||0,n.width=e.offsetWidth||0,n.top=e.offsetTop,n.left=e.offsetLeft}return null}componentDidUpdate(){}render(){return this.props.children}}function U({children:i,isPresent:l}){const e=t.useId(),n=t.useRef(null),C=t.useRef({width:0,height:0,top:0,left:0}),{nonce:f}=t.useContext(A);return t.useInsertionEffect(()=>{const{width:d,height:o,top:h,left:s}=C.current;if(l||!n.current||!d||!o)return;n.current.dataset.motionPopId=e;const c=document.createElement("style");return f&&(c.nonce=f),document.head.appendChild(c),c.sheet&&c.sheet.insertRule(`
          [data-motion-pop-id="${e}"] {
            position: absolute !important;
            width: ${d}px !important;
            height: ${o}px !important;
            top: ${h}px !important;
            left: ${s}px !important;
          }
        `),()=>{document.head.removeChild(c)}},[l]),g.jsx(K,{isPresent:l,childRef:n,sizeRef:C,children:t.cloneElement(i,{ref:n})})}const X=({children:i,initial:l,isPresent:e,onExitComplete:n,custom:C,presenceAffectsLayout:f,mode:d})=>{const o=w(q),h=t.useId(),s=t.useCallback(a=>{o.set(a,!0);for(const x of o.values())if(!x)return;n&&n()},[o,n]),c=t.useMemo(()=>({id:h,initial:l,isPresent:e,custom:C,onExitComplete:s,register:a=>(o.set(a,!1),()=>o.delete(a))}),f?[Math.random(),s]:[e,s]);return t.useMemo(()=>{o.forEach((a,x)=>o.set(x,!1))},[e]),t.useEffect(()=>{!e&&!o.size&&n&&n()},[e]),d==="popLayout"&&(i=g.jsx(U,{isPresent:e,children:i})),g.jsx(T.Provider,{value:c,children:i})};function q(){return new Map}const v=i=>i.key||"";function j(i){const l=[];return t.Children.forEach(i,e=>{t.isValidElement(e)&&l.push(e)}),l}const G=({children:i,custom:l,initial:e=!0,onExitComplete:n,presenceAffectsLayout:C=!0,mode:f="sync",propagate:d=!1})=>{const[o,h]=$(d),s=t.useMemo(()=>j(i),[i]),c=d&&!o?[]:s.map(v),a=t.useRef(!0),x=t.useRef(s),y=w(()=>new Map),[I,L]=t.useState(s),[p,k]=t.useState(s);S(()=>{a.current=!1,x.current=s;for(let u=0;u<p.length;u++){const r=v(p[u]);c.includes(r)?y.delete(r):y.get(r)!==!0&&y.set(r,!1)}},[p,c.length,c.join("-")]);const R=[];if(s!==I){let u=[...s];for(let r=0;r<p.length;r++){const m=p[r],M=v(m);c.includes(M)||(u.splice(r,0,m),R.push(m))}f==="wait"&&R.length&&(u=R),k(j(u)),L(s);return}const{forceRender:E}=t.useContext(D);return g.jsx(g.Fragment,{children:p.map(u=>{const r=v(u),m=d&&!o?!1:s===p||c.includes(r),M=()=>{if(y.has(r))y.set(r,!0);else return;let P=!0;y.forEach(b=>{b||(P=!1)}),P&&(E==null||E(),k(x.current),d&&(h==null||h()),n&&n())};return g.jsx(X,{isPresent:m,initial:!a.current||e?void 0:!1,custom:m?void 0:l,presenceAffectsLayout:C,mode:f,onExitComplete:m?void 0:M,children:u},r)})})};/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=z("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=z("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);export{G as A,H as T,O as X};
