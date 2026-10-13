import body from './body';
import LegacyScripts from '@/components/LegacyScripts';

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <LegacyScripts />
    </>
  );
}