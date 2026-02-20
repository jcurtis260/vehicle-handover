import { requireAuth } from "@/lib/auth-helpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitCommit, Calendar } from "lucide-react";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

async function getCommits(): Promise<GitHubCommit[]> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/jcurtis260/vehicle-handover/commits?per_page=50",
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function groupByDate(commits: GitHubCommit[]) {
  const groups: Record<string, GitHubCommit[]> = {};
  for (const commit of commits) {
    const date = new Date(commit.commit.author.date).toLocaleDateString(
      "en-GB",
      { day: "2-digit", month: "long", year: "numeric" }
    );
    if (!groups[date]) groups[date] = [];
    groups[date].push(commit);
  }
  return groups;
}

export default async function ChangelogPage() {
  await requireAuth();
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  if (!isAdmin && !session?.user?.canViewChangelog) {
    redirect("/dashboard");
  }
  const commits = await getCommits();
  const grouped = groupByDate(commits);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Changelog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recent updates and changes to the application.
        </p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No changelog entries available.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateCommits]) => (
            <Card key={date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {date}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dateCommits.map((commit) => {
                    const lines = commit.commit.message.split("\n");
                    const title = lines[0];
                    const body = lines
                      .slice(1)
                      .filter((l) => l.trim() && !l.includes("Co-authored-by:"))
                      .join("\n");
                    const time = new Date(
                      commit.commit.author.date
                    ).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={commit.sha}
                        className="flex gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                      >
                        <div className="mt-0.5 shrink-0">
                          <GitCommit className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono shrink-0">
                              {time}
                            </span>
                            <p className="text-sm font-medium leading-snug">
                              {title}
                            </p>
                          </div>
                          {body && (
                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap pl-12">
                              {body}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
