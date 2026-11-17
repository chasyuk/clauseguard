declare module 'docx' {
  export const AlignmentType: {
    LEFT: 'left';
    CENTER: 'center';
    RIGHT: 'right';
    JUSTIFIED: 'both';
  };
  export const HeadingLevel: {
    TITLE: 'Title';
    HEADING_1: 'Heading1';
    HEADING_2: 'Heading2';
    HEADING_3: 'Heading3';
  };
  export class TextRun {
    constructor(options: {
      text: string;
      bold?: boolean;
      italics?: boolean;
      size?: number;
      font?: string;
      color?: string;
    });
  }
  export class Paragraph {
    constructor(options: {
      text?: string;
      heading?: string;
      alignment?: string;
      spacing?: { before?: number; after?: number; line?: number };
      children?: TextRun[];
    });
  }
  export class Document {
    constructor(options: {
      sections: Array<{ children: Paragraph[] }>;
    });
  }
  export const Packer: {
    toBuffer(doc: Document): Promise<Buffer>;
  };
}
