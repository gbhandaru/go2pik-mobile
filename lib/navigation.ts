type RouterLike = {
  push: (href: any) => void;
  replace: (href: any) => void;
};

export function pushRoute(router: RouterLike, path: string) {
  router.push(path as never);
}

export function replaceRoute(router: RouterLike, path: string) {
  router.replace(path as never);
}
