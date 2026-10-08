import { Redirect } from 'expo-router';

/** El plan incluye cursos; la app no enlaza a su contratación. */
export default function Plan() {
  return <Redirect href="/academia" />;
}
