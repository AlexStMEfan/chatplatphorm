import type { BaseEditor, Descendant } from "slate";
import type { ReactEditor } from "slate-react";

export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

export type ParagraphElement = {
  type: "paragraph";
  children: CustomText[];
};

export type HeadingOneElement = {
  type: "heading-one";
  children: CustomText[];
};

export type HeadingTwoElement = {
  type: "heading-two";
  children: CustomText[];
};

export type BlockquoteElement = {
  type: "blockquote";
  children: CustomText[];
};

export type CodeBlockElement = {
  type: "code";
  children: CustomText[];
};

export type ListItemElement = {
  type: "list-item";
  children: CustomText[];
};

export type BulletedListElement = {
  type: "bulleted-list";
  children: ListItemElement[];
};

export type NumberedListElement = {
  type: "numbered-list";
  children: ListItemElement[];
};

export type CustomElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | BlockquoteElement
  | CodeBlockElement
  | ListItemElement
  | BulletedListElement
  | NumberedListElement;

// расширяем Slate
declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}