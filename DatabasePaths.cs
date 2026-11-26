using System;
using System.IO;

namespace MiraverseOSx;

/// <summary>
/// Single standardized resolution policy for canonical and runtime SQLite databases.
/// Order: MIRAVERSE_SOURCE_DATABASE env var -> current working directory -> application base directory.
/// </summary>
internal static class DatabasePaths
{
    public static string ResolveSourceDatabase()
    {
        var configured = Environment.GetEnvironmentVariable("MIRAVERSE_SOURCE_DATABASE");
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return Path.GetFullPath(configured);
        }

        var cwdDatabase = Path.Combine(Directory.GetCurrentDirectory(), "miraverse.db");
        if (File.Exists(cwdDatabase))
        {
            return Path.GetFullPath(cwdDatabase);
        }

        return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "miraverse.db"));
    }
}
