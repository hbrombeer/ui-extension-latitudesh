declare module '@rancher/auto-import' {
  export function importTypes(ext: any): void;
}

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}
