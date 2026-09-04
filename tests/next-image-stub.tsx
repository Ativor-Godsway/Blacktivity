/**
 * Stand-in for next/image in the render test.
 *
 * next/image gets its config from a webpack-replaced object, which cannot be
 * reproduced outside a Next build — so in-process it throws for every remote
 * host. The renderer's own behaviour (figure wrapper, aspect-ratio from stored
 * dimensions, object-contain, blur placeholder) is what this test is for, and
 * host rules are covered by the malformed cases, which assert those images are
 * dropped before next/image is ever reached.
 */
import type { ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  fill?: boolean;
  blurDataURL?: string;
  placeholder?: string;
  quality?: number;
  priority?: boolean;
  sizes?: string;
};

export default function NextImageStub({
  fill: _fill,
  blurDataURL: _blur,
  placeholder: _ph,
  quality: _q,
  priority: _p,
  ...rest
}: Props) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...rest} alt={rest.alt} />;
}
