from __future__ import annotations
from typing import Dict, Any
import networkx as nx

def differentiation_proxy(node_latent: Dict[str,Any]) -> float:
    N = node_latent.get("traits", {}).get("N", 0.5) if node_latent.get("traits") else 0.5
    BIS = node_latent.get("state", {}).get("BIS", 0.5) if node_latent.get("state") else 0.5
    recovery = node_latent.get("state", {}).get("recovery", 0.5) if node_latent.get("state") else 0.5
    dos = (1.0 - float(N))*0.45 + (1.0 - float(BIS))*0.35 + float(recovery)*0.20
    return float(max(0.0, min(1.0, dos)))

def triangle_risk(G: nx.Graph, a: str, b: str, c: str) -> float:
    def edge_risk(x,y):
        return float(G.edges[x,y].get("conflict_risk", 0.0))
    r = edge_risk(a,b) + edge_risk(a,c) + edge_risk(b,c)
    return float(min(1.0, r/2.0))

def compute_bowen(G: nx.Graph) -> Dict[str,Any]:
    dos = {n: differentiation_proxy(G.nodes[n].get("latent", {})) for n in G.nodes}
    triangles = []
    nodes = list(G.nodes)
    for i in range(len(nodes)):
        for j in range(i+1,len(nodes)):
            for k in range(j+1,len(nodes)):
                a,b,c = nodes[i],nodes[j],nodes[k]
                if G.has_edge(a,b) and G.has_edge(a,c) and G.has_edge(b,c):
                    tr = triangle_risk(G,a,b,c)
                    if tr > 0.4:
                        triangles.append({"a":a,"b":b,"c":c,"risk":tr})
    triangles.sort(key=lambda x: -x["risk"])
    return {"differentiation_proxy": dos, "triangles": triangles[:20]}
