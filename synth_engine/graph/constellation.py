from __future__ import annotations
from typing import Dict, Any, List
import networkx as nx

def build_graph(nodes: List[Dict[str,Any]], edges: List[Dict[str,Any]]) -> nx.Graph:
    G = nx.Graph()
    for n in nodes:
        G.add_node(n["person_id"], **n)
    for e in edges:
        G.add_edge(e["from"], e["to"], **e)
    return G

def edge_conflict_risk(a_lat: Dict[str,Any], b_lat: Dict[str,Any]) -> float:
    aN = a_lat.get("traits",{}).get("N",0.5) if a_lat.get("traits") else 0.5
    bN = b_lat.get("traits",{}).get("N",0.5) if b_lat.get("traits") else 0.5
    aB = a_lat.get("state",{}).get("BIS",0.5) if a_lat.get("state") else 0.5
    bB = b_lat.get("state",{}).get("BIS",0.5) if b_lat.get("state") else 0.5
    r = 0.35*(float(aN)+float(bN)) + 0.25*(float(aB)+float(bB))
    return float(min(1.0, r/1.2))

def annotate_edges(G: nx.Graph) -> None:
    for u,v in G.edges:
        au = G.nodes[u].get("latent",{})
        av = G.nodes[v].get("latent",{})
        G.edges[u,v]["conflict_risk"] = edge_conflict_risk(au,av)
