declare global {
  namespace App {
    interface PageState {
      pagerViewer?: string;
    }
    interface Locals {
      user: { id: string; name: string; isAdmin?: boolean } | null;
    }
  }
}
export {};
