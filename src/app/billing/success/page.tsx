import { BillingConfirm } from '@/components/billing-confirm';
export const metadata = {
  title: '구독 시작',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default async function BillingSuccess({
  searchParams,
}: {
  searchParams: Promise<{ authKey?: string; customerKey?: string }>;
}) {
  const q = await searchParams;
  return (
    <div className="center-page">
      <BillingConfirm authKey={q.authKey || ''} customerKey={q.customerKey || ''} />
    </div>
  );
}
