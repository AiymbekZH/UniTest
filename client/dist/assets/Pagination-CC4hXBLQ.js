import{j as t}from"./index-BMB_T_2m.js";import{c as n}from"./createLucideIcon-BEkwU064.js";import{C as c}from"./chevron-left-CDFsciw9.js";import{C as m}from"./chevron-right-pWKqCMl_.js";/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=n("ChevronsLeft",[["path",{d:"m11 17-5-5 5-5",key:"13zhaf"}],["path",{d:"m18 17-5-5 5-5",key:"h8a8et"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=n("ChevronsRight",[["path",{d:"m6 17 5-5-5-5",key:"xnjwq"}],["path",{d:"m13 17 5-5-5-5",key:"17xmmf"}]]);function v({currentPage:r,totalPages:o,onPageChange:e}){if(o<=1)return null;const h=()=>{const s=[],l=Math.max(2,r-2),a=Math.min(o-1,r+2);s.push(1),l>2&&s.push("...");for(let i=l;i<=a;i++)s.push(i);return a<o-1&&s.push("..."),o>1&&s.push(o),s};return t.jsxs("div",{className:"flex items-center justify-center gap-1.5 mt-8",children:[t.jsx("button",{onClick:()=>e(1),disabled:r===1,className:`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 \r
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors`,title:"Начало",children:t.jsx(x,{size:16})}),t.jsx("button",{onClick:()=>e(r-1),disabled:r===1,className:`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 \r
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors`,title:"Назад",children:t.jsx(c,{size:16})}),h().map((s,d)=>s==="..."?t.jsx("span",{className:"px-2 text-gray-400 text-sm",children:"."},`dots-${d}`):t.jsx("button",{onClick:()=>e(s),className:`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all
              ${r===s?"bg-primary-600 text-white shadow-lg shadow-primary-600/25":"text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"}`,children:s},s)),t.jsx("button",{onClick:()=>e(r+1),disabled:r===o,className:`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 \r
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors`,title:"Далее",children:t.jsx(m,{size:16})}),t.jsx("button",{onClick:()=>e(o),disabled:r===o,className:`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 \r
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors`,title:"Последняя",children:t.jsx(b,{size:16})})]})}export{v as P};
