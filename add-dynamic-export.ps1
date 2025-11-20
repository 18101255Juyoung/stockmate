$files = @(
    "src\app\api\portfolio\analysis\generate\route.ts",
    "src\app\api\portfolio\analysis\route.ts",
    "src\app\api\posts\route.ts",
    "src\app\api\ai\journal\[date]\route.ts",
    "src\app\api\users\[username]\follow-status\route.ts",
    "src\app\api\users\[username]\unfollow\route.ts",
    "src\app\api\users\[username]\follow\route.ts",
    "src\app\api\upload\route.ts",
    "src\app\api\users\me\route.ts",
    "src\app\api\posts\[id]\verify\route.ts",
    "src\app\api\posts\[id]\like\route.ts",
    "src\app\api\posts\[id]\comments\[commentId]\route.ts",
    "src\app\api\posts\[id]\comments\route.ts",
    "src\app\api\posts\[id]\route.ts",
    "src\app\api\transactions\sell\route.ts",
    "src\app\api\transactions\buy\route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -notmatch "export const dynamic") {
            # Find the position after imports (before the first export function/async)
            $pattern = "(import.*?\n)+\n"
            if ($content -match $pattern) {
                $content = $content -replace "($pattern)", "`$1export const dynamic = 'force-dynamic'`n`n"
                Set-Content -Path $file -Value $content -NoNewline
                Write-Host "Added dynamic export to: $file"
            }
        }
    }
}
