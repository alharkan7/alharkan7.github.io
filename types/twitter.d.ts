interface Window {
  twttr: {
    widgets: {
      load: (element?: HTMLElement) => void;
      createTweet: (
        id: string,
        element: HTMLElement | null,
        options?: {
          theme?: 'light' | 'dark';
          dnt?: boolean;
          [key: string]: any;
        }
      ) => Promise<HTMLElement>;
    };
  };
}