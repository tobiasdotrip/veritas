export interface SEOMeta {
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article" | "profile";
  canonical?: string;
  noindex?: boolean;
}

export function buildSEOTags(meta: SEOMeta) {
  const tags: { tag: string; attrs: Record<string, string> }[] = [];
  tags.push({ tag: "title", attrs: { title: meta.title } });
  tags.push({
    tag: "meta",
    attrs: { name: "description", content: meta.description },
  });
  if (meta.noindex) {
    tags.push({ tag: "meta", attrs: { name: "robots", content: "noindex" } });
  }
  if (meta.canonical) {
    tags.push({ tag: "link", attrs: { rel: "canonical", href: meta.canonical } });
  }
  tags.push({
    tag: "meta",
    attrs: { property: "og:title", content: meta.title },
  });
  tags.push({
    tag: "meta",
    attrs: { property: "og:description", content: meta.description },
  });
  tags.push({
    tag: "meta",
    attrs: { property: "og:type", content: meta.type ?? "website" },
  });
  tags.push({
    tag: "meta",
    attrs: { property: "og:locale", content: "fr_FR" },
  });
  if (meta.image) {
    tags.push({
      tag: "meta",
      attrs: { property: "og:image", content: meta.image },
    });
  }
  tags.push({
    tag: "meta",
    attrs: { name: "twitter:card", content: "summary_large_image" },
  });
  tags.push({
    tag: "meta",
    attrs: { name: "twitter:title", content: meta.title },
  });
  tags.push({
    tag: "meta",
    attrs: { name: "twitter:description", content: meta.description },
  });
  if (meta.image) {
    tags.push({
      tag: "meta",
      attrs: { name: "twitter:image", content: meta.image },
    });
  }
  return tags;
}

export function jsonLdScript(json: unknown) {
  return {
    type: "application/ld+json",
    innerHTML: JSON.stringify(json),
  };
}
