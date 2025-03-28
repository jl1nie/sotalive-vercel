from datetime import datetime

import os
import tempfile

os.environ["MPLCONFIGDIR"] = tempfile.mkdtemp()
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import json
import sys
from io import BytesIO


def WSPRspots(jstr):

    js = json.loads(jstr)

    plots = []
    for p in js["plots"]:
        try:
            fm = int(datetime.strptime(p["from"], "%Y-%m-%d %H:%M").timestamp())
            to = int(datetime.strptime(p["to"], "%Y-%m-%d %H:%M").timestamp())
        except ValueError:
            fm = int(datetime.strptime(p["from"], "%Y/%m/%d %H:%M:%S").timestamp())
            to = int(datetime.strptime(p["to"], "%Y/%m/%d %H:%M:%S").timestamp())

        plots.append(
            {
                "label": p["label"],
                "color": p["color"],
                "from": fm,
                "to": to,
                "repo": [],
                "dist": [],
                "snr": [],
                "avgdist": [],
                "avgsnr": [],
            }
        )

    plots.sort(key=lambda x: x["from"])

    mindist = int(js["min"])
    maxdist = int(js["max"])
    addlabel = js["label"]

    wsprspot = []
    reporter = {}

    for l in js["spots"].split("\n"):
        col = l.split()
        if len(col) == 13:
            call, freq, snr = col[2], col[3], col[4]
            dft, grid, pwr = col[5], col[6], col[7]
            rp, rgrid, km, az = col[8], col[9], col[10], col[11]
            try:
                ts = int(
                    datetime.strptime(
                        col[0] + " " + col[1], "%Y-%m-%d %H:%M"
                    ).timestamp()
                )
            except ValueError:
                ts = int(
                    datetime.strptime(
                        col[0] + " " + col[1], "%Y/%m/%d %H:%M:%S"
                    ).timestamp()
                )
            reporter[rp] = {"distance": int(km), "azimath": int(az)}
            if int(km) >= mindist and int(km) <= maxdist:
                wsprspot.append({"ts": ts, "snr": int(snr), "repo": rp})

    wsprspot.sort(key=lambda x: x["ts"])

    i = 0
    for sp in wsprspot:
        while True:
            if i < len(plots):
                if sp["ts"] >= plots[i]["from"]:
                    if sp["ts"] <= plots[i]["to"]:
                        plots[i]["snr"].append(sp["snr"])
                        plots[i]["repo"].append(sp["repo"])
                        plots[i]["dist"].append(reporter[sp["repo"]]["distance"])
                        break
                    else:
                        i += 1
                        continue
                else:
                    break
            else:
                break

    rpts = None
    for p in plots:
        if not rpts:
            rpts = set(p["repo"])
        else:
            rpts = rpts & set(p["repo"])

    cmnrptr = {}
    for stn in rpts:
        cmnrptr[stn] = {
            "dist": reporter[stn]["distance"],
            "snr": [[] for n in range(0, len(plots))],
        }

    cmnlst = sorted(list(cmnrptr), key=lambda x: cmnrptr[x]["dist"])

    i = 0
    for sp in wsprspot:
        while True:
            if i < len(plots):
                if sp["ts"] >= plots[i]["from"]:
                    if sp["ts"] <= plots[i]["to"]:
                        if sp["repo"] in rpts:
                            cmnrptr[sp["repo"]]["snr"][i].append(sp["snr"])
                        break
                    else:
                        i += 1
                        continue
                else:
                    break
            else:
                break

    fig, axes = plt.subplots(1, 1)

    fig.set_figwidth(int(js["width"]) / 120)

    for rp in cmnlst:
        for j in range(0, i):
            l = cmnrptr[rp]["snr"][j]
            if len(l) > 0:
                plots[j]["avgsnr"].append(sum(l) / len(l))
            else:
                plots[j]["avgsnr"].append(0)
            plots[j]["avgdist"].append(cmnrptr[rp]["dist"])

    for p in plots:
        x = p["dist"]
        y = p["snr"]
        axes.scatter(
            x,
            y,
            label=p["label"] + f" {len(p['snr'])}spots",
            c=p["color"],
            marker="o",
            alpha=0.8,
        )

        if addlabel:
            for i, label in enumerate(p["repo"]):
                axes.annotate(label, (x[i], y[i]))

        xa = p["avgdist"]
        ya = p["avgsnr"]
        axes.plot(xa, ya, c=p["color"], marker="x", alpha=0.2)

    axes.set_title(js["title"])
    axes.set_xlabel("Distance (km)")
    axes.set_ylabel("SNR (dB)")
    axes.grid()
    axes.legend()

    buffer = BytesIO()
    plt.savefig(buffer, format="svg")
    buffer.seek(0)

    plt.close()
    return buffer
