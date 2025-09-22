import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

export interface LichessProfile {
  id: string;
  username: string;
  perfs: {
    blitz?: { rating: number };
    bullet?: { rating: number };
    rapid?: { rating: number };
    classical?: { rating: number };
    puzzle?: { rating: number };
  };
  createdAt: number;
  profile?: {
    firstName?: string;
    lastName?: string;
  };
  title?: string;
  patron?: boolean;
}

export default function Lichess<P extends LichessProfile>(
  options: OAuthUserConfig<P>
): OAuthConfig<P> {
  return {
    id: "lichess",
    name: "Lichess",
    type: "oauth",
    authorization: {
      url: "https://lichess.org/oauth",
      params: {
        scope: "preference:read", // Minimal scope - just read basic preferences
      },
    },
    token: "https://lichess.org/api/token",
    userinfo: "https://lichess.org/api/account",
    client: {
      token_endpoint_auth_method: "none", // Lichess doesn't require client auth
    },
    checks: ["pkce", "state"], // Use PKCE for security
    profile(profile) {
      return {
        id: profile.id,
        name: profile.username,
        email: `${profile.username}@lichess.org`, // Lichess doesn't provide email, use placeholder
        image: `https://lichess1.org/assets/_Nh6WOr/logo/lichess-pad12.svg`, // Default Lichess logo
      };
    },
    style: {
      logo: "/lichess-logo.svg",
      bg: "#161512",
      text: "#bababa",
    },
    options,
  };
}