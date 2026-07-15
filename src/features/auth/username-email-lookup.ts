import { authEmailSchema, normalizeUsername } from './username-auth';

type Awaitable<T> = PromiseLike<T> | T;

type UserProfileEmailLookupClient = {
  from(table: 'user_profiles'): {
    select(columns: 'email'): {
      eq(
        column: 'username',
        value: string,
      ): {
        maybeSingle(): Awaitable<{
          data: { email?: string | null } | null;
          error: { message?: string | null } | null;
        }>;
      };
    };
  };
};

export async function lookupAuthEmailForUsername(input: {
  client: UserProfileEmailLookupClient;
  username: string;
}) {
  const parsedDirectEmail = authEmailSchema.safeParse(input.username);

  if (parsedDirectEmail.success) {
    return parsedDirectEmail.data;
  }

  const normalizedUsername = normalizeUsername(input.username);

  if (!normalizedUsername) {
    return null;
  }

  const { data, error } = await input.client
    .from('user_profiles')
    .select('email')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const parsedEmail = authEmailSchema.safeParse(data?.email ?? '');

  return parsedEmail.success ? parsedEmail.data : null;
}
