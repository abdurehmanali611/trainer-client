import { Redirect, type Href } from 'expo-router';

/** Plans moved into the Train tab — keep old links working. */
export default function PlansRedirect() {
  return <Redirect href={'/train?tab=workout' as Href} />;
}
