import type { BridgeConfig, ClientSettings, Routing } from "./types";

export function buildTorrc(opts: {
  settings: ClientSettings;
  routing: Routing;
  selectedExitCountry: string;
  excludedCountries: string[];
  bridgesEnabled: boolean;
  transport: Routing;
}): string {
  const { settings: s } = opts;
  const lines = [
    "SocksPort 127.0.0.1:9050 IsolateDestAddr IsolateDestPort IsolateSOCKSAuth IsolateClientProtocol",
    "SocksPort 127.0.0.1:9052 IsolateDestAddr IsolateSOCKSAuth IsolateClientProtocol",
    "HTTPTunnelPort 127.0.0.1:9080",
    "DNSPort 127.0.0.1:9053",
    "AutomapHostsOnResolve 1",
    "ControlPort 127.0.0.1:9051",
    "ClientOnly 1",
    "Log notice stdout",
    "ClientRejectInternalAddresses 1",
    s.avoidDiskWrites ? "AvoidDiskWrites 1" : null,
    s.useEntryGuards ? `UseEntryGuards 1` : "UseEntryGuards 0",
    s.useEntryGuards ? `NumEntryGuards ${s.numEntryGuards}` : null,
    `NewCircuitPeriod ${s.newCircuitMinutes * 60}`,
    `MaxCircuitDirtiness ${s.maxCircuitDirtiness * 60}`,
    s.ipv6 ? "ClientUseIPv6 1" : "ClientUseIPv6 0",
    s.strictNodes ? "StrictNodes 1" : "StrictNodes 0",
    opts.selectedExitCountry !== "auto"
      ? `ExitNodes {${opts.selectedExitCountry.toLowerCase()}}`
      : null,
    opts.excludedCountries.length
      ? `ExcludeNodes ${opts.excludedCountries.map((c) => `{${c.toLowerCase()}}`).join(",")}`
      : null,
    opts.bridgesEnabled ? "UseBridges 1" : "UseBridges 0",
    opts.transport === "snowflake"
      ? "ClientTransportPlugin snowflake exec snowflake-client"
      : opts.transport === "obfs4"
        ? "ClientTransportPlugin obfs4 exec lyrebird"
        : opts.transport === "meek"
          ? "ClientTransportPlugin meek_lite exec lyrebird"
          : opts.transport === "webtunnel"
            ? "ClientTransportPlugin webtunnel exec lyrebird"
            : null,
  ];
  return lines.filter(Boolean).join("\n");
}

export function bridgesNeeded(
  routing: Routing,
  bridges: BridgeConfig,
): boolean {
  return bridges.enabled || routing !== "standard";
}
