import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

def box(ax, x, y, w, h, text, fc="#dbeafe", ec="#1d4ed8", fs=10, bold=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08", fc=fc, ec=ec, lw=1.5))
    ax.text(x + w/2, y + h/2, text, ha="center", va="center", fontsize=fs, fontweight="bold" if bold else "normal", wrap=True)

def arrow(ax, p1, p2, text=None, color="#374151", style="-|>", ls="-", off=(0, 0.12), fs=8):
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle=style, mutation_scale=14, color=color, lw=1.4, linestyle=ls))
    if text:
        ax.text((p1[0]+p2[0])/2 + off[0], (p1[1]+p2[1])/2 + off[1], text, ha="center", fontsize=fs, color=color)

def canvas(w, h):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(0, w); ax.set_ylim(0, h); ax.axis("off")
    return fig, ax

# 1. System architecture
fig, ax = canvas(10, 6)
ax.add_patch(FancyBboxPatch((1.9, 0.3), 7.9, 5.4, boxstyle="round,pad=0.02,rounding_size=0.1", fc="#f8fafc", ec="#64748b", lw=1.5, ls="--"))
ax.text(5.85, 5.4, "Docker network: todo-net", ha="center", fontsize=10, color="#475569", style="italic")
box(ax, 0.1, 2.6, 1.4, 0.8, "Browser\n(user)", "#fef9c3", "#a16207", bold=True)
box(ax, 2.3, 2.5, 1.7, 1.0, "gateway\nNginx :8080\nload balancer", "#fde68a", "#b45309", bold=True)
box(ax, 4.6, 4.3, 1.8, 0.8, "frontend\nReact + Nginx", "#dbeafe", "#1d4ed8")
for i, y in enumerate([3.2, 2.3, 1.4]):
    box(ax, 4.6, y - 0.1 if i else y, 1.8, 0.7, f"backend-{i+1}\nNode.js API", "#dcfce7", "#15803d")
box(ax, 7.2, 3.3, 1.9, 0.8, "redis\nmessage queue", "#fee2e2", "#b91c1c", bold=True)
box(ax, 7.2, 1.9, 1.9, 0.8, "worker\nNode.js consumer", "#ede9fe", "#6d28d9", bold=True)
box(ax, 7.2, 0.5, 1.9, 0.8, "mongo\nMongoDB", "#e0f2fe", "#0369a1", bold=True)
arrow(ax, (1.5, 3.0), (2.3, 3.0), "HTTP")
arrow(ax, (4.0, 3.3), (4.6, 4.5), "/", off=(-0.05, 0.1))
arrow(ax, (4.0, 3.0), (4.6, 3.5), "/api")
arrow(ax, (4.0, 2.9), (4.6, 2.7))
arrow(ax, (4.0, 2.7), (4.6, 1.8))
arrow(ax, (6.4, 3.6), (7.2, 3.7), "LPUSH", off=(0, 0.12))
arrow(ax, (8.15, 3.3), (8.15, 2.7), "BRPOP", off=(0.4, 0))
arrow(ax, (8.15, 1.9), (8.15, 1.3), "save", off=(0.35, 0))
arrow(ax, (6.4, 1.6), (7.2, 0.9), "CRUD")
ax.text(3.3, 0.9, "3 identical replicas\n(round-robin)", fontsize=8, ha="center", color="#15803d")
fig.savefig("fig_architecture.png", dpi=170, bbox_inches="tight"); plt.close(fig)

# 2. Docker engine architecture
fig, ax = canvas(10, 4.6)
box(ax, 0.2, 1.8, 2.2, 1.2, "Docker Client\n(docker CLI)\n$ docker compose up", "#fef9c3", "#a16207", bold=True)
ax.add_patch(FancyBboxPatch((3.3, 0.5), 3.4, 3.6, boxstyle="round,pad=0.02,rounding_size=0.1", fc="#f1f5f9", ec="#475569", lw=1.5))
ax.text(5.0, 3.8, "Docker Host", ha="center", fontweight="bold", fontsize=10)
box(ax, 3.55, 2.5, 2.9, 0.9, "Docker Daemon (dockerd)", "#dbeafe", "#1d4ed8", bold=True)
box(ax, 3.55, 1.2, 1.3, 0.9, "Images", "#dcfce7", "#15803d")
box(ax, 5.15, 1.2, 1.3, 0.9, "Containers", "#ede9fe", "#6d28d9")
box(ax, 7.6, 1.8, 2.1, 1.2, "Registry\n(Docker Hub)\nnode, mongo, redis...", "#fee2e2", "#b91c1c", bold=True)
arrow(ax, (2.4, 2.4), (3.55, 2.9), "REST API", off=(0, 0.15))
arrow(ax, (6.45, 2.9), (7.6, 2.6), "pull / push", off=(0, 0.15))
arrow(ax, (4.2, 2.5), (4.2, 2.1)); arrow(ax, (5.8, 2.5), (5.8, 2.1))
fig.savefig("fig_docker_engine.png", dpi=170, bbox_inches="tight"); plt.close(fig)

# 3. VM vs container
fig, axs = plt.subplots(1, 2, figsize=(10, 4.4))
for ax, title in zip(axs, ["Virtual machines", "Containers"]):
    ax.set_xlim(0, 5); ax.set_ylim(0, 5.4); ax.axis("off"); ax.set_title(title, fontweight="bold")
def stack(ax, layers, apps):
    y = 0.2
    for text, c in layers:
        box(ax, 0.2, y, 4.6, 0.6, text, c, "#475569", fs=9); y += 0.75
    return y
y = stack(axs[0], [("Physical hardware", "#e5e7eb"), ("Host operating system", "#e5e7eb"), ("Hypervisor", "#fde68a")], None)
for i in range(3):
    x = 0.2 + i*1.55
    box(axs[0], x, y, 1.45, 0.55, "Guest OS", "#fecaca", "#b91c1c", fs=8)
    box(axs[0], x, y+0.6, 1.45, 0.55, "Libs/Bins", "#dbeafe", "#1d4ed8", fs=8)
    box(axs[0], x, y+1.2, 1.45, 0.55, f"App {i+1}", "#dcfce7", "#15803d", fs=8)
y = stack(axs[1], [("Physical hardware", "#e5e7eb"), ("Host operating system", "#e5e7eb"), ("Docker Engine", "#fde68a")], None)
for i in range(3):
    x = 0.2 + i*1.55
    box(axs[1], x, y+0.6, 1.45, 0.55, "Libs/Bins", "#dbeafe", "#1d4ed8", fs=8)
    box(axs[1], x, y+1.2, 1.45, 0.55, f"App {i+1}", "#dcfce7", "#15803d", fs=8)
fig.tight_layout(); fig.savefig("fig_vm_vs_container.png", dpi=170, bbox_inches="tight"); plt.close(fig)

# 4. Sequence: create task flow
fig, ax = canvas(10, 5.4)
actors = [("Browser", 0.8), ("Gateway", 2.7), ("Backend\n(replica)", 4.6), ("MongoDB", 6.4), ("Redis", 7.9), ("Worker", 9.3)]
for n, x in actors:
    box(ax, x-0.6, 4.7, 1.2, 0.55, n, "#dbeafe", "#1d4ed8", fs=8, bold=True)
    ax.plot([x, x], [0.2, 4.7], color="#94a3b8", lw=1, ls="--")
steps = [(0.8, 2.7, 4.2, "1. POST /api/todos"), (2.7, 4.6, 3.8, "2. round-robin to a replica"),
         (4.6, 6.4, 3.4, "3. insert todo"), (4.6, 7.9, 3.0, "4. LPUSH todo.created"),
         (4.6, 0.8, 2.6, "5. 201 Created (instant)"), (9.3, 7.9, 2.0, "6. BRPOP event"),
         (9.3, 6.4, 1.4, "7. wait 2 s, save notification"), (0.8, 4.6, 0.7, "8. GET /api/notifications (poll)")]
for a, b, y, t in steps:
    arrow(ax, (a, y), (b, y), t, off=(0, 0.1))
fig.savefig("fig_sequence.png", dpi=170, bbox_inches="tight"); plt.close(fig)

# 5. Request distribution mock (illustrative of design, not measurements)
fig, ax = canvas(10, 2.8)
box(ax, 0.2, 1.0, 1.6, 0.8, "Dockerfile", "#fef9c3", "#a16207", bold=True)
box(ax, 2.6, 1.0, 1.6, 0.8, "Image\ntodo-backend", "#dcfce7", "#15803d", bold=True)
for i, y in enumerate([1.95, 1.0, 0.05]):
    box(ax, 5.4, y, 1.7, 0.7, f"Container {i+1}", "#ede9fe", "#6d28d9")
box(ax, 8.0, 1.0, 1.7, 0.8, "worker\n(same image,\nother command)", "#fee2e2", "#b91c1c")
arrow(ax, (1.8, 1.4), (2.6, 1.4), "docker build")
for y in [2.3, 1.35, 0.4]:
    arrow(ax, (4.2, 1.4), (5.4, y), None)
ax.text(4.8, 2.5, "docker run x3", fontsize=8)
arrow(ax, (4.2, 1.2), (8.0, 1.2), None, ls=":")
fig.savefig("fig_image_flow.png", dpi=170, bbox_inches="tight"); plt.close(fig)
print("done")
