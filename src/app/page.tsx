import Link from 'next/link';
import { ArrowUpRight, Sparkles, BookOpen, Play } from 'lucide-react';
import { Catalog } from '@/components/catalog';
import { articles } from '@/lib/data';
export default async function Home() {
  const items = await articles();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> 더 가까워지는 AI, 더 넓어지는 가능성
          </span>
          <h1>
            AI를 아는 만큼,
            <br />
            <span>나의 세상이 넓어집니다.</span>
          </h1>
          <p>
            어렵게 느껴졌던 AI 지식을 쉽고 깊게.
            <br />
            읽고, 배우고, 내 일에 바로 써보세요.
          </p>
          <div className="hero-actions">
            <Link className="button" href="#knowledge">
              무료로 지식 둘러보기 <ArrowUpRight size={17} />
            </Link>
            <Link className="text-link" href="/courses">
              VOD 클래스 보기
            </Link>
          </div>
          <div className="hero-note">
            <BookOpen size={15} /> 모든 글은 회원이라면 무료로 읽을 수 있어요.
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-glow" />
          <div className="floating-tag tag-top">
            <Sparkles size={16} /> 오늘, 새로운 가능성 하나
          </div>
          <div className="knowledge-cube">
            <div className="cube-icon">
              ai<span>✳</span>
            </div>
            <div className="cube-line" />
            <div className="cube-text">
              KNOWLEDGE
              <br />
              BECOMES POSSIBILITY.
            </div>
            <div className="cube-bottom">
              YOUR NEXT CHAPTER <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="floating-tag tag-bottom">
            <span className="mini-play">
              <Play size={13} fill="currentColor" />
            </span>{' '}
            읽는 지식에서, 쓰는 지식으로.
          </div>
          <span className="visual-caption">A SPACE FOR YOUR NEXT IDEA</span>
        </div>
      </section>
      <div className="value-strip">
        <span>
          <BookOpen size={18} /> 부담 없이 읽는 무료 지식
        </span>
        <span>
          <Play size={18} /> 차근차근 따라 하는 실전 클래스
        </span>
        <span>
          <Sparkles size={18} /> 오늘의 업무에 바로 적용
        </span>
      </div>
      <Catalog articles={items} />
      <section className="membership-banner">
        <div>
          <span className="eyebrow">LEARN. TRY. MAKE IT YOURS.</span>
          <h2>읽는 것에서 한 걸음 더.</h2>
          <p>모든 VOD 클래스를 월 19,900원으로 만나세요.</p>
        </div>
        <Link className="button light" href="/membership">
          멤버십 알아보기 <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
