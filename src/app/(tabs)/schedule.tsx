import { Redirect, type Href } from 'expo-router';

/** Schedule moved into the Train tab — keep old links working. */
export default function ScheduleRedirect() {
  return <Redirect href={'/train?tab=sessions' as Href} />;
}
