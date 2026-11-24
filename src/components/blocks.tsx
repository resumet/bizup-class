import { Block } from '@/lib/model';
import { Fragment, ReactNode } from 'react';
export function Blocks({ block }: { block: Block }) {
  const children = block.content?.map((b, i) => <Blocks key={i} block={b} />);
  if (block.type === 'text') {
    let out: ReactNode = block.text;
    for (const mark of block.marks || []) {
      if (mark.type === 'bold') out = <strong>{out}</strong>;
      if (mark.type === 'italic') out = <em>{out}</em>;
      if (mark.type === 'strike') out = <s>{out}</s>;
      if (mark.type === 'code') out = <code>{out}</code>;
      if (mark.type === 'link') {
        const href = String(mark.attrs?.href || '');
        if (/^https?:\/\//.test(href))
          out = (
            <a href={href} rel="noopener noreferrer">
              {out}
            </a>
          );
      }
    }
    return <>{out}</>;
  }
  switch (block.type) {
    case 'doc':
      return <>{children}</>;
    case 'paragraph':
      return <p>{children}</p>;
    case 'heading':
      return block.attrs?.level === 3 ? <h3>{children}</h3> : <h2>{children}</h2>;
    case 'bulletList':
      return <ul>{children}</ul>;
    case 'orderedList':
      return <ol>{children}</ol>;
    case 'listItem':
      return <li>{children}</li>;
    case 'blockquote':
      return <blockquote>{children}</blockquote>;
    case 'codeBlock':
      return (
        <pre>
          <code>{children}</code>
        </pre>
      );
    case 'hardBreak':
      return <br />;
    case 'horizontalRule':
      return <hr />;
    case 'image': {
      const src = String(block.attrs?.src || '');
      return /^\/api\/media\/[0-9a-f-]+$/.test(src) ? (
        <figure>
          <img src={src} alt={String(block.attrs?.alt || '콘텐츠 이미지')} />
          {!!block.attrs?.alt && <figcaption>{String(block.attrs.alt)}</figcaption>}
        </figure>
      ) : null;
    }
    default:
      return <Fragment>{children}</Fragment>;
  }
}
