import{c as t,m as i}from"./createLucideIcon-BoklhwOY.js";import{j as e}from"./index-tDd-VYlQ.js";import{C as p}from"./check-oemuwkmV.js";import{T as g}from"./triangle-alert-CL6fIUMY.js";import{A as f}from"./index-zcdPVian.js";import{X as k}from"./x-C0W_YdAe.js";/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=t("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=t("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T=t("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=t("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]),o={danger:{icon:j,bg:"bg-red-50 dark:bg-red-900/20",color:"text-red-500"},warning:{icon:g,bg:"bg-amber-50 dark:bg-amber-900/20",color:"text-amber-500"},success:{icon:p,bg:"bg-emerald-50 dark:bg-emerald-900/20",color:"text-emerald-500"},info:{icon:u,bg:"bg-primary-50 dark:bg-primary-900/20",color:"text-primary-500"}};function A({isOpen:s,onClose:a,onConfirm:c,title:l="Подтверждение",message:n="Вы уверены?",confirmText:d="Подтвердить",cancelText:m="Отмена",variant:r="danger"}){if(!s)return null;const{icon:x,bg:b,color:h}=o[r]||o.info;return e.jsx(f,{children:s&&e.jsxs(i.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 z-[220] flex min-h-screen items-center justify-center overflow-y-auto p-4",onClick:a,children:[e.jsx("div",{className:"absolute inset-0 bg-slate-950/50 backdrop-blur-sm"}),e.jsxs(i.div,{initial:{opacity:0,scale:.96,y:12},animate:{opacity:1,scale:1,y:0},exit:{opacity:0,scale:.96,y:12},transition:{type:"spring",damping:28,stiffness:320},onClick:y=>y.stopPropagation(),className:"relative my-auto w-full max-w-sm rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden dark:border-slate-700 dark:bg-slate-800",children:[e.jsx("button",{onClick:a,className:"absolute top-3 right-3 icon-btn h-8 w-8",children:e.jsx(k,{size:15})}),e.jsxs("div",{className:"px-6 pt-8 pb-5",children:[e.jsx("div",{className:`w-12 h-12 ${b} rounded-xl flex items-center justify-center mx-auto mb-4`,children:e.jsx(x,{size:20,className:h})}),e.jsx("h3",{className:"text-base font-semibold text-dark dark:text-white text-center mb-1.5",children:l}),e.jsx("p",{className:"text-gray-400 dark:text-gray-400 text-center text-sm leading-relaxed",children:n})]}),e.jsxs("div",{className:"flex gap-2 px-6 pb-6",children:[e.jsx("button",{onClick:a,className:"btn-secondary flex-1 text-sm",children:m}),e.jsx("button",{onClick:()=>{c(),a()},className:`flex-1 py-2 px-5 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98]
                  ${r==="danger"?"bg-red-500 hover:bg-red-600":r==="warning"?"bg-amber-500 hover:bg-amber-600":r==="success"?"bg-emerald-500 hover:bg-emerald-600":"bg-primary-500 hover:bg-primary-600"}`,children:d})]})]})]})})}export{A as C,I as G,u as I,T as S,j as T};
