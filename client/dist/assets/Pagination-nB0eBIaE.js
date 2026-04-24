import{j as s}from"./index-DZE8iyBM.js";import{c as h}from"./createLucideIcon-CFqrZDs2.js";import{C as x}from"./chevron-left-C6vpM1qE.js";import{C as c}from"./chevron-right-D1yqVfug.js";/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=h("ChevronsLeft",[["path",{d:"m11 17-5-5 5-5",key:"13zhaf"}],["path",{d:"m18 17-5-5 5-5",key:"h8a8et"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=h("ChevronsRight",[["path",{d:"m6 17 5-5-5-5",key:"xnjwq"}],["path",{d:"m13 17 5-5-5-5",key:"17xmmf"}]]);function k({currentPage:e,totalPages:i,onPageChange:r}){if(i<=1)return null;const m=()=>{const t=[],a=Math.max(2,e-2),l=Math.min(i-1,e+2);t.push(1),a>2&&t.push("...");for(let o=a;o<=l;o++)t.push(o);return l<i-1&&t.push("..."),i>1&&t.push(i),t},n="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200 transition-colors";return s.jsxs("div",{className:"flex items-center justify-center gap-1 mt-8",children:[s.jsx("button",{onClick:()=>r(1),disabled:e===1,className:n,title:"Начало",children:s.jsx(p,{size:14})}),s.jsx("button",{onClick:()=>r(e-1),disabled:e===1,className:n,title:"Назад",children:s.jsx(x,{size:14})}),m().map((t,d)=>t==="..."?s.jsx("span",{className:"px-1 text-gray-300 text-xs",children:"•••"},`dots-${d}`):s.jsx("button",{onClick:()=>r(t),className:`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-all
              ${e===t?"bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300":"text-gray-500 hover:bg-gray-50 hover:text-dark dark:text-gray-400 dark:hover:bg-slate-800"}`,children:t},t)),s.jsx("button",{onClick:()=>r(e+1),disabled:e===i,className:n,title:"Далее",children:s.jsx(c,{size:14})}),s.jsx("button",{onClick:()=>r(i),disabled:e===i,className:n,title:"Последняя",children:s.jsx(b,{size:14})})]})}export{k as P};
