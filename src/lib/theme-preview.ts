/** In-process actions for the canvas prompt; never persisted or sent to the iframe. */
export type ThemePreviewActions = {
  name: string;
  apply: () => void;
  cancel: () => void;
  hasCustomCss: boolean;
  withoutCss: boolean;
  setWithoutCss: (value: boolean) => void;
};
