/* Broadcast Atelier: an editorial companion page that previews the compact extension as a premium studio instrument. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, ExternalLink, FileText, Link2, MonitorUp } from "lucide-react";

const textureUrl = "/manus-storage/streamlink-calibration-texture_1972e42a.png";
const signalFieldUrl = "/manus-storage/streamlink-signal-field_5d5e2101.png";
const markUrl = `${import.meta.env.BASE_URL}streamlink-link-icon.png`;

function validUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function deriveFilename(value: string) {
  try {
    const url = new URL(value.trim());
    const segment = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || url.hostname.replace(/^www\./i, "stream"));
    return (segment.replace(/\.[a-z0-9]{1,10}$/i, "") || "stream").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-");
  } catch {
    return "stream";
  }
}

function cleanFilename(value: string) {
  return (value.replace(/\.strm$/i, "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").trim() || "stream").slice(0, 120);
}

function triggerStrmDownload(streamUrl: string, filename: string) {
  const blob = new Blob([`${streamUrl.trim()}\n`], { type: "application/octet-stream" });
  const download = document.createElement("a");
  download.href = URL.createObjectURL(blob);
  download.download = filename;
  document.body.appendChild(download);
  download.click();
  download.remove();
  window.setTimeout(() => URL.revokeObjectURL(download.href), 1000);
}

export default function Home() {
  const [url, setUrl] = useState("https://example.com/movie.mp4");
  const [name, setName] = useState("movie");
  const [status, setStatus] = useState<"ready" | "success" | "error">("ready");
  const [message, setMessage] = useState("Ready to route a URL.");
  const [copied, setCopied] = useState(false);
  const handoffCompleted = useRef(false);
  const handoff = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const streamUrl = params.get("streamUrl")?.trim() || "";
    const requestedFilename = params.get("filename") || "";
    if (params.get("handoff") !== "1" || !validUrl(streamUrl)) return null;
    return { streamUrl, filename: `${cleanFilename(requestedFilename || deriveFilename(streamUrl))}.strm` };
  }, []);
  const filename = useMemo(() => `${cleanFilename(name)}.strm`, [name]);

  useEffect(() => {
    if (!handoff || handoffCompleted.current) return;
    handoffCompleted.current = true;
    setUrl(handoff.streamUrl);
    setName(cleanFilename(handoff.filename));
    const downloadTimer = window.setTimeout(() => {
      triggerStrmDownload(handoff.streamUrl, handoff.filename);
      setStatus("success");
      setMessage(`Saved ${handoff.filename}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 320);
    return () => window.clearTimeout(downloadTimer);
  }, [handoff]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setName(deriveFilename(value));
    setStatus("ready");
    setMessage("Ready to route a URL.");
  };

  const saveFile = () => {
    if (!validUrl(url)) {
      setStatus("error");
      setMessage("Enter a complete HTTP or HTTPS URL.");
      return;
    }
    triggerStrmDownload(url, filename);
    setStatus("success");
    setMessage(`Saved ${filename}`);
  };

  const copyText = async () => {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#111110] text-[#f4eee4]">
      <div className="pointer-events-none fixed inset-0 opacity-[0.065] mix-blend-screen" style={{ backgroundImage: `url(${textureUrl})`, backgroundSize: "420px" }} />
      <header className="relative z-10 mx-auto flex max-w-[1380px] items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <img src={markUrl} className="h-10 w-10" alt="" />
          <div>
            <p className="m-0 text-[17px] font-semibold tracking-[-0.06em]">StreamLink</p>
            <p className="mono m-0 mt-0.5 text-[9px] tracking-[0.18em] text-[#7e7a74]">SAVER / EXTENSION</p>
          </div>
        </div>
        <a className="mono flex items-center gap-2 border border-[#f4eee4]/15 px-3 py-2 text-[10px] tracking-[0.08em] text-[#cfc8bd] transition-colors hover:border-[#ff5630] hover:text-[#ff8467]" href="#install">
          INSTALL IN CHROME <ExternalLink size={12} />
        </a>
      </header>

      <section className="relative z-10 mx-auto grid max-w-[1380px] gap-14 px-6 pb-20 pt-9 lg:grid-cols-[1fr_560px] lg:items-center lg:px-10 lg:pb-32 lg:pt-20">
        <div className="max-w-[630px]">
          <p className="mono mb-5 text-[10px] tracking-[0.18em] text-[#ff8062]">STREAMING URL / LOCAL OUTPUT</p>
          <h1 className="m-0 text-[clamp(3.7rem,7vw,7.1rem)] font-semibold leading-[.84] tracking-[-0.09em]">Route a stream<br />into your <span className="font-serif font-normal italic text-[#ff5630]">library.</span></h1>
          <p className="mt-8 max-w-[470px] text-[17px] leading-7 text-[#aaa59e]">A small Chrome extension for writing a streaming link into a media-library-ready <span className="mono text-[#ded7cc]">.strm</span> file. No media is downloaded or handled.</p>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-4 border-y border-[#f4eee4]/10 py-5 mono text-[10px] tracking-[0.08em] text-[#928d86]">
            <span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-[#8ecf91] shadow-[0_0_8px_rgba(142,207,145,.7)]" /> LOCAL FILE CREATION</span>
            <span>HTTP + HTTPS URLs</span>
            <span>MANIFEST V3</span>
          </div>
        </div>

        <section className="relative mx-auto w-full max-w-[440px] shadow-[0_32px_80px_rgba(0,0,0,.5)]" aria-label="Interactive extension preview">
          <div className="absolute -inset-7 -z-10 bg-[#ff5630]/10 blur-3xl" />
          <div className="absolute left-0 right-0 top-0 h-[3px] bg-[#ff5630]" />
          <div className="border border-[#f4eee4]/15 bg-[#181817] p-5">
            <div className="flex items-center justify-between border-b border-[#f4eee4]/10 pb-4">
              <div className="flex items-center gap-2.5"><img src={markUrl} className="h-7 w-7" alt="" /><div><p className="m-0 text-sm font-semibold tracking-[-.05em]">StreamLink</p><p className="mono m-0 mt-1 text-[8px] tracking-[.14em] text-[#77736d]">SAVER / v1.0</p></div></div>
              <span className="mono inline-flex items-center gap-1.5 border border-[#f4eee4]/10 px-2 py-1 text-[8px] tracking-[.12em] text-[#9f9a92]"><i className="h-1 w-1 rounded-full bg-[#8ecf91]" />LOCAL</span>
            </div>
            <div className="pt-7">
              <p className="mono m-0 text-[9px] tracking-[.15em] text-[#a39e98]">ROUTE A SOURCE</p>
              <h2 className="mt-2 text-[32px] font-semibold leading-[.95] tracking-[-.08em]">Save a link<br />as <span className="font-serif font-normal italic text-[#ff5630]">.strm</span>.</h2>
              <p className="mt-2 text-xs leading-5 text-[#99948d]">The file stores the URL only. It does not download the media.</p>

              <div className="mt-6 flex items-center justify-between"><label htmlFor="source" className="mono text-[9px] tracking-[.14em] text-[#aaa49c]">SOURCE URL</label><button type="button" onClick={() => handleUrlChange("https://example.com/movie.mp4")} className="mono text-[9px] text-[#ded7cc] hover:text-[#ff8062]">Use example</button></div>
              <div className={`mt-2 flex items-center gap-2 border bg-black/20 px-3 py-3 transition-colors ${status === "error" ? "border-[#ff5630]" : "border-[#f4eee4]/15 focus-within:border-[#ff5630]"}`}><Link2 size={16} className="shrink-0 text-[#8e8983]" /><input id="source" value={url} onChange={(event) => handleUrlChange(event.target.value)} className="mono min-w-0 flex-1 bg-transparent text-[11px] text-[#f4eee4] outline-none placeholder:text-[#6c6863]" spellCheck={false} placeholder="https://example.com/movie.mp4" /></div>
              <p className={`mono mt-1.5 min-h-3 text-[9px] ${status === "error" ? "text-[#ff9078]" : "text-[#77736d]"}`}>{status === "error" ? "Enter a complete HTTP or HTTPS URL." : "HTTPS and HTTP links are supported."}</p>

              <div className="ml-2 mt-4 h-7 border-l border-[#f4eee4]/15"><div className="relative top-[18px] -left-[3px] h-1.5 w-1.5 rounded-full bg-[#ff5630] shadow-[0_0_12px_rgba(255,86,48,.75)]" /></div>
              <div className="flex items-center justify-between"><label htmlFor="filename" className="mono text-[9px] tracking-[.14em] text-[#aaa49c]">OUTPUT FILE</label><span className="mono border border-[#ff5630]/50 px-1.5 py-0.5 text-[8px] tracking-[.1em] text-[#ffad99]">.STRM</span></div>
              <div className="mt-2 flex items-center gap-3 border border-[#f4eee4]/15 bg-white/[.035] p-3"><FileText size={28} strokeWidth={1.25} className="text-[#ded6ca]" /><div className="min-w-0 flex-1"><input id="filename" value={name} onChange={(event) => setName(event.target.value)} className="mono w-full bg-transparent text-[12px] text-[#f4eee4] outline-none" spellCheck={false} /><p className="mono m-0 mt-1 truncate text-[9px] text-[#77736d]">{filename}</p></div><i className={`h-2 w-2 rounded-full ${status === "success" ? "bg-[#8ecf91] shadow-[0_0_10px_rgba(142,207,145,.7)]" : "bg-[#ff5630] shadow-[0_0_10px_rgba(255,86,48,.7)]"}`} /></div>
              <button type="button" onClick={saveFile} className="mt-5 flex w-full items-center justify-between bg-[#ff5630] px-4 py-3.5 text-[13px] font-semibold tracking-[-.02em] text-[#1b0b07] transition-all hover:bg-[#ff704e] active:scale-[.975]">Save Stream Link<Download size={17} /></button>
              <p className={`mono mb-0 mt-2.5 text-center text-[9px] ${status === "success" ? "text-[#a7dba9]" : status === "error" ? "text-[#ff9078]" : "text-[#77736d]"}`}>{message}</p>
            </div>
          </div>
        </section>
      </section>

      <section className="relative z-10 border-t border-[#f4eee4]/10 bg-[#151514]" id="install">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-6 py-16 lg:grid-cols-[1.25fr_.75fr] lg:px-10 lg:py-20">
          <div>
            <p className="mono m-0 text-[10px] tracking-[.16em] text-[#ff8062]">THE OUTPUT, UNCOMPLICATED</p>
            <div className="mt-6 overflow-hidden border border-[#f4eee4]/15 bg-[#0e0e0d]"><div className="flex items-center justify-between border-b border-[#f4eee4]/10 px-5 py-3 mono text-[9px] tracking-[.12em] text-[#908b84]"><span>{filename}</span><button onClick={copyText} type="button" className="flex items-center gap-2 hover:text-[#ff8062]">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "COPIED" : "COPY URL"}</button></div><pre className="m-0 overflow-x-auto px-5 py-6 mono text-[13px] leading-6 text-[#e8e0d4]">{url || "https://example.com/movie.mp4"}</pre></div>
          </div>
          <div className="border-l-0 border-[#f4eee4]/10 lg:border-l lg:pl-10"><p className="mono m-0 text-[10px] tracking-[.16em] text-[#a29d95]">INSTALL LOCALLY</p><ol className="mt-5 space-y-4 pl-5 text-sm leading-6 text-[#aaa59e]"><li>Extract the extension archive.</li><li>Open <span className="mono text-[#e8e0d4]">chrome://extensions</span> and enable Developer mode.</li><li>Select <span className="text-[#e8e0d4]">Load unpacked</span>, then choose the extracted folder.</li></ol><div className="mt-7 flex items-center gap-2 mono text-[10px] tracking-[.1em] text-[#8ecf91]"><MonitorUp size={14} /> READY FOR CHROME</div></div>
        </div>
      </section>
      <div className="relative z-10 h-44 bg-cover bg-center opacity-35" style={{ backgroundImage: `linear-gradient(90deg, #111110 0%, transparent 30%, transparent 70%, #111110 100%), url(${signalFieldUrl})` }} />
    </main>
  );
}
