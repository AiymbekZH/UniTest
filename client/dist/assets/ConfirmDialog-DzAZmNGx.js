import{c as a,m as o}from"./createLucideIcon-DEE60JPd.js";import{j as e}from"./index-C_SJfgpx.js";import{T as b,X as p}from"./x-DydlEGsp.js";import{A as k}from"./index-D8-36CR4.js";/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=a("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=a("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=a("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=a("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=a("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]),i={danger:{icon:v,bg:"bg-red-100 dark:bg-red-900/30",color:"text-red-600"},warning:{icon:b,bg:"bg-amber-100 dark:bg-amber-900/30",color:"text-amber-600"},success:{icon:u,bg:"bg-emerald-100 dark:bg-emerald-900/30",color:"text-emerald-600"},info:{icon:f,bg:"bg-primary-100 dark:bg-primary-900/30",color:"text-primary-600"}};function I({isOpen:s,onClose:r,onConfirm:l,title:c="Подтверждение",message:d="Вы уверены?",confirmText:n="Подтвердить",cancelText:m="Отмена",variant:t="danger"}){if(!s)return null;const{icon:x,bg:g,color:h}=i[t]||i.info;return e.jsx(k,{children:s&&e.jsxs(o.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 z-[220] flex min-h-screen items-center justify-center overflow-y-auto p-4",onClick:r,children:[e.jsx("div",{className:"absolute inset-0 bg-black/40 backdrop-blur-sm"}),e.jsxs(o.div,{initial:{opacity:0,scale:.9,y:20},animate:{opacity:1,scale:1,y:0},exit:{opacity:0,scale:.9,y:20},transition:{type:"spring",damping:25,stiffness:300},onClick:y=>y.stopPropagation(),className:"relative my-auto w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden dark:bg-slate-800",children:[e.jsx("button",{onClick:r,className:"absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 transition-colors",children:e.jsx(p,{size:18})}),e.jsxs("div",{className:"p-6 sm:p-8",children:[e.jsx("div",{className:`w-14 h-14 ${g} rounded-2xl flex items-center justify-center mx-auto mb-5`,children:e.jsx(x,{size:24,className:h})}),e.jsx("h3",{className:"text-xl font-bold text-dark dark:text-white text-center mb-2",children:c}),e.jsx("p",{className:"text-gray-500 dark:text-gray-400 text-center text-sm leading-relaxed",children:d})]}),e.jsxs("div",{className:"flex gap-3 p-6 pt-0 sm:px-8 sm:pb-8",children:[e.jsx("button",{onClick:r,className:`flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-medium\r
                  text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98]`,children:m}),e.jsx("button",{onClick:()=>{l(),r()},className:`flex-1 py-3 px-4 rounded-xl text-sm font-medium text-white transition-all active:scale-[0.98]
                  ${t==="danger"?"bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25":t==="warning"?"bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25":t==="success"?"bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25":"bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/25"}`,children:n})]})]})]})})}export{I as C,C as G,f as I,z as S,v as T,u as a};
