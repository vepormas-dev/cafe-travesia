import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@travesia/shared';
import type { PostSummary } from '@/lib/data/catalog';
import { cn } from '@/lib/cn';

export function PostCard({ post, className }: { post: PostSummary; className?: string }) {
  return (
    <article className={cn('group', className)}>
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-arena">
          {post.coverUrl ? <Image src={post.coverUrl} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" className="object-cover transition duration-700 group-hover:scale-105" /> : null}
        </div>
        <p className="mt-5 text-[0.68rem] font-semibold tracking-[0.18em] text-ambar-700 uppercase">
          {post.category} — {post.readingMin} min de lectura
        </p>
        <h3 className="mt-2 font-display text-2xl leading-snug text-noche transition group-hover:text-ambar-700">{post.title}</h3>
        {post.excerpt ? <p className="mt-2 line-clamp-3 text-[0.95rem] leading-relaxed text-gris">{post.excerpt}</p> : null}
        <p className="mt-3 text-xs text-gris">
          {post.authorName} · <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </p>
      </Link>
    </article>
  );
}
