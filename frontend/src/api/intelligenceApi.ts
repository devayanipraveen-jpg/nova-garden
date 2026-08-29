import { apiFetch } from "./client";
const base=(projectId:string,issueId:string)=>`/projects/${projectId}/issues/${issueId}`;
export const bugDna=(p:string,i:string)=>apiFetch<any>(`${base(p,i)}/dna`);
export const impact=(p:string,i:string)=>apiFetch<any>(`${base(p,i)}/impact`);
export const rootCause=(p:string,i:string)=>apiFetch<any>(`${base(p,i)}/root-cause`);
export const evolution=(p:string,i:string)=>apiFetch<any>(`${base(p,i)}/evolution`);
export const memory=(p:string,i:string)=>apiFetch<any>(`${base(p,i)}/memory`);
export const recommendation=(p:string,i:string)=>apiFetch<any>(`${base(p,i)}/recommendation`);
export const prevention=(p:string,i:string)=>apiFetch<any>(`${base(p,i)}/preventions`);
export const completePrevention=(p:string,i:string,id:string)=>apiFetch<any>(`${base(p,i)}/preventions/${id}/complete`,{method:"POST"});
export const simulate=(p:string,i:string,durationDays:number)=>apiFetch<any>(`${base(p,i)}/simulations`,{method:"POST",body:JSON.stringify({durationDays})});
export const autopsy=(p:string,i:string)=>apiFetch<any>(`${base(p,i)}/autopsy`,{method:"POST"});
export const addComment=(p:string,i:string,body:string)=>apiFetch<any>(`${base(p,i)}/comments`,{method:"POST",body:JSON.stringify({body})});
export const health=(p:string)=>apiFetch<any>(`/projects/${p}/health`); export const risk=(p:string)=>apiFetch<any>(`/projects/${p}/risk`); export const season=(p:string)=>apiFetch<any>(`/projects/${p}/season`); export const analytics=(p:string)=>apiFetch<any>(`/projects/${p}/analytics`); export const notifications=(p:string)=>apiFetch<any[]>(`/projects/${p}/notifications`); export const readNotification=(p:string,id:string)=>apiFetch<any>(`/projects/${p}/notifications/${id}/read`,{method:"PATCH"});

