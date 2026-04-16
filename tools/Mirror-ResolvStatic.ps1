#Requires -Version 5.1
<#
  Espelha o conteúdo público de resolv.com.br para a raiz deste projeto.
  - Baixa HTML de páginas institucionais, contato, vídeos, blog (com paginação) e posts.
  - Baixa CSS/JS/imagens referenciados no próprio domínio.
  - Reescreve URLs absolutas do site para caminhos relativos à raiz (ex.: /css/style.css).

  Uso: .\tools\Mirror-ResolvStatic.ps1
  Servir localmente: na raiz do projeto, use um servidor HTTP (ex.: VS Code Live Server).
  Formulários POST não funcionam em site 100% estático; substituir por serviço de e-mail/API na próxima entrega.
#>

$ErrorActionPreference = 'Stop'
$Base = 'https://resolv.com.br'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$OutRoot = $RepoRoot

New-Item -ItemType Directory -Force -Path $OutRoot | Out-Null

function Get-UrlPathFile {
  param([string]$Url)
  $u = [Uri]$Url
  if ($u.Host -notmatch 'resolv\.com\.br$') { return $null }
  $path = [Uri]::UnescapeDataString($u.AbsolutePath)
  if ($path -eq '' -or $path -eq '/') {
    return Join-Path $OutRoot 'index.html'
  }
  $trim = $path.Trim('/')
  $last = Split-Path $trim -Leaf
  if ($last -match '\.[a-zA-Z0-9]{1,8}$') {
    return Join-Path $OutRoot ($trim -replace '/', [IO.Path]::DirectorySeparatorChar)
  }
  $dirPath = Join-Path $OutRoot ($trim -replace '/', [IO.Path]::DirectorySeparatorChar)
  return Join-Path $dirPath 'index.html'
}

function Save-RemoteFile {
  param([string]$Url, [string]$DestPath)
  $dir = Split-Path $DestPath -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  curl.exe -sfL $Url -o $DestPath
  if ($LASTEXITCODE -ne 0) { throw "Falha ao baixar: $Url" }
}

function Invoke-DownloadHtml {
  param([string]$Url)
  $dest = Get-UrlPathFile $Url
  if (-not $dest) { return }
  Write-Host "  HTML $Url -> $dest"
  Save-RemoteFile $Url $dest
}

function Get-BlogArticleUrls {
  $all = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  for ($page = 1; $page -le 40; $page++) {
    $listUrl = "$Base/blog?page=$page"
    $tmp = Join-Path $env:TEMP "resolv-blog-$page.html"
    try {
      curl.exe -sfL $listUrl -o $tmp
    } catch {
      break
    }
    if ($LASTEXITCODE -ne 0) { break }
    $html = Get-Content -Raw -Path $tmp -Encoding UTF8
    $matches = [regex]::Matches($html, 'href="(https://(?:www\.)?resolv\.com\.br/blog/[^"]+)"')
    $newCount = 0
    foreach ($m in $matches) {
      $u = $m.Groups[1].Value -replace 'https://www\.resolv\.com\.br', $Base -replace 'https://resolv\.com\.br', $Base
      if ($all.Add($u)) { $newCount++ }
    }
    if ($newCount -eq 0 -and $page -gt 1) { break }
  }
  return $all
}

$seed = @(
  '/',
  '/quem-somos',
  '/facilities',
  '/seguranca',
  '/alimentacao',
  '/hospitalar',
  '/esg',
  '/videos',
  '/politica-de-privacidade',
  '/blog',
  '/blog/alimentacao',
  '/blog/facilities',
  '/blog/hospitalar',
  '/blog/seguranca',
  '/contato/comercial',
  '/contato/atendimento-ao-cliente',
  '/contato/atendimento-ao-funcionario',
  '/contato/trabalhe-conosco'
)

Write-Host 'Coletando URLs do blog...'
$blogUrls = Get-BlogArticleUrls
Write-Host "  $($blogUrls.Count) URLs de posts/categorias únicas."

$htmlUrls = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($s in $seed) {
  [void]$htmlUrls.Add($Base + $s)
}
foreach ($b in $blogUrls) {
  [void]$htmlUrls.Add($b)
}

Write-Host 'Baixando páginas HTML...'
foreach ($u in $htmlUrls) {
  try {
    Invoke-DownloadHtml $u
  } catch {
    Write-Warning $_
  }
}

Write-Host 'Extraindo e baixando assets (css, js, imagens, fontes)...'
$assetPattern = '(?:src|href)="(https://(?:www\.)?resolv\.com\.br[^"]+)"'
$assets = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
Get-ChildItem -Path $OutRoot -Recurse -Filter '*.html' | ForEach-Object {
  $raw = Get-Content -Raw -Path $_.FullName -Encoding UTF8
  foreach ($m in [regex]::Matches($raw, $assetPattern)) {
    $u = $m.Groups[1].Value -replace '\?.*$', ''
    $u = $u -replace 'https://www\.resolv\.com\.br', $Base -replace 'https://resolv\.com\.br', $Base
    if ($u -match '\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)(\?|$)') {
      [void]$assets.Add($u)
    }
  }
  # background-image: url(...)
  foreach ($m in [regex]::Matches($raw, 'url\((https://(?:www\.)?resolv\.com\.br[^)]+)\)')) {
    $u = $m.Groups[1].Value.Trim("'`"") -replace '\?.*$', ''
    $u = $u -replace 'https://www\.resolv\.com\.br', $Base -replace 'https://resolv\.com\.br', $Base
    if ($u -match '\.(css|js|png|jpg|jpeg|gif|svg|webp|ico)(\?|$)') {
      [void]$assets.Add($u)
    }
  }
  foreach ($m in [regex]::Matches($raw, 'content="(https://(?:www\.)?resolv\.com\.br[^"]+\.(?:jpg|jpeg|png|gif|webp|svg))"')) {
    [void]$assets.Add(($m.Groups[1].Value -replace '\?.*$', ''))
  }
}

foreach ($extra in @("$Base/images/resolv.jpg")) {
  [void]$assets.Add($extra)
}

foreach ($u in $assets) {
  try {
    $rel = ([Uri]$u).AbsolutePath.TrimStart('/')
    if (-not $rel) { continue }
    $dest = Join-Path $OutRoot ($rel -replace '/', [IO.Path]::DirectorySeparatorChar)
    if (Test-Path $dest) { continue }
    Write-Host "  asset $u"
    Save-RemoteFile $u $dest
  } catch {
    Write-Warning "Asset: $_"
  }
}

Write-Host 'Baixando assets referenciados nos arquivos CSS (url relativa)...'
$cssFromDisk = Get-ChildItem -Path $OutRoot -Recurse -Filter '*.css'
foreach ($cssFile in $cssFromDisk) {
  $relFromRoot = $cssFile.FullName.Substring($OutRoot.Length).Replace('\', '/').TrimStart('/')
  $cssPublicUrl = $Base.TrimEnd('/') + '/' + $relFromRoot
  $baseUri = [Uri]$cssPublicUrl
  $text = Get-Content -Raw -Path $cssFile.FullName -Encoding UTF8
  foreach ($m in [regex]::Matches($text, 'url\(([^)]+)\)')) {
    $raw = $m.Groups[1].Value.Trim().Trim('"').Trim("'")
    if ($raw -match '^(https?:)?//' -or $raw -match '^data:') { continue }
    try {
      $abs = [Uri]::new($baseUri, $raw).AbsoluteUri
      if ($abs -notmatch 'resolv\.com\.br') { continue }
      $abs = $abs -replace '\?.*$', ''
      $ext = [regex]::Match($abs, '\.([a-zA-Z0-9]+)(\?|$)').Groups[1].Value
      if ($ext -notin @('css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'ttf', 'woff', 'woff2', 'eot')) { continue }
      $rel = ([Uri]$abs).AbsolutePath.TrimStart('/')
      if (-not $rel) { continue }
      $dest = Join-Path $OutRoot ($rel -replace '/', [IO.Path]::DirectorySeparatorChar)
      if (Test-Path $dest) { continue }
      Write-Host "  css-> $abs"
      Save-RemoteFile $abs $dest
    } catch {
      Write-Warning "CSS url: $_"
    }
  }
}

Write-Host 'Reescrevendo URLs absolutas do domínio para caminhos na raiz...'
$replacements = @(
  @{ From = 'https://www.resolv.com.br'; To = '' },
  @{ From = 'https://resolv.com.br'; To = '' }
)
Get-ChildItem -Path $OutRoot -Recurse -Filter '*.html' | ForEach-Object {
  $c = Get-Content -Raw -Path $_.FullName -Encoding UTF8
  foreach ($r in $replacements) {
    $c = $c.Replace($r.From, $r.To)
  }
  $c = $c -replace '\?v=\d+', ''
  Set-Content -Path $_.FullName -Value $c -Encoding UTF8 -NoNewline
}

Get-ChildItem -Path $OutRoot -Recurse -Filter '*.css' | ForEach-Object {
  $c = Get-Content -Raw -Path $_.FullName -Encoding UTF8
  foreach ($r in $replacements) {
    $c = $c.Replace($r.From, $r.To)
  }
  $c = $c -replace '\?v=\d+', ''
  Set-Content -Path $_.FullName -Value $c -Encoding UTF8 -NoNewline
}

Write-Host "Concluído. Saída: $OutRoot"
