/** Original samples, written for Gnuplot Online. */
const GnuplotExamples = {
  "defaultSource": "# A function and a few observations\nset title \"A little signal, a little noise\" font \",18\"\nset xlabel \"Time (s)\"\nset ylabel \"Amplitude\"\nset grid back lc rgb \"#e2eaed\"\nset border 3 lc rgb \"#718994\"\nset tics nomirror\nset key top right\nset xrange [0:10]\nf(x) = sin(x) * exp(-x/8)\n$observations << EOD\n0.5 0.52\n1.5 0.77\n2.5 0.49\n3.5 -0.18\n4.5 -0.55\n5.5 -0.39\n6.5 0.16\n7.5 0.42\n8.5 0.31\n9.5 -0.08\nEOD\nplot f(x) title \"Damped wave\" with lines lw 3 lc rgb \"#087e8b\", \\\n     $observations title \"Observations\" with points pt 7 ps 1.2 lc rgb \"#e49c46\"",
  "catalog": [
    {
      "id": "damped-wave",
      "label": "A little signal",
      "description": "Functions, observations and a legend",
      "tags": [
        "functions",
        "lines"
      ],
      "source": "# A function and a few observations\nset title \"A little signal, a little noise\" font \",18\"\nset xlabel \"Time (s)\"\nset ylabel \"Amplitude\"\nset grid back lc rgb \"#e2eaed\"\nset border 3 lc rgb \"#718994\"\nset tics nomirror\nset key top right\nset xrange [0:10]\nf(x) = sin(x) * exp(-x/8)\n$observations << EOD\n0.5 0.52\n1.5 0.77\n2.5 0.49\n3.5 -0.18\n4.5 -0.55\n5.5 -0.39\n6.5 0.16\n7.5 0.42\n8.5 0.31\n9.5 -0.08\nEOD\nplot f(x) title \"Damped wave\" with lines lw 3 lc rgb \"#087e8b\", \\\n     $observations title \"Observations\" with points pt 7 ps 1.2 lc rgb \"#e49c46\"",
      "files": {}
    },
    {
      "id": "functions",
      "label": "Function playground",
      "description": "Sine, cosine and their sum",
      "tags": [
        "functions",
        "lines"
      ],
      "source": "set title \"Waves, together\"\nset xlabel \"x\"\nset ylabel \"Amplitude\"\nset grid\nset xrange [-2*pi:2*pi]\nplot sin(x) lw 3 lc rgb \"#087e8b\" title \"sin(x)\", cos(x) lw 3 lc rgb \"#e49c46\" title \"cos(x)\", sin(x)+cos(x) dt 2 lw 2 title \"Their sum\"",
      "files": {}
    },
    {
      "id": "temperature",
      "label": "A week outside",
      "description": "Read observations from a data file",
      "tags": [
        "data",
        "lines"
      ],
      "source": "set title \"A week outside\"\nset xlabel \"Day\"\nset ylabel \"Temperature (°C)\"\nset grid ytics\nset key top left\nplot 'temperature.dat' using 1:2 with linespoints lw 3 pt 7 lc rgb \"#087e8b\" title \"Afternoon\", '' using 1:3 with linespoints lw 3 pt 5 lc rgb \"#e49c46\" title \"Morning\"",
      "files": {
        "temperature.dat": "# Day Afternoon Morning\n1 21 12\n2 23 13\n3 19 11\n4 18 10\n5 22 12\n6 25 14\n7 24 15\n"
      }
    },
    {
      "id": "histogram",
      "label": "How we travel",
      "description": "Grouped histograms with category labels",
      "tags": [
        "data",
        "histograms"
      ],
      "source": "set title \"How we travel\"\nset ylabel \"Trips per week\"\nset style data histograms\nset style histogram clustered gap 1\nset style fill solid 0.8 border -1\nset boxwidth 0.85\nset yrange [0:*]\n$D << EOD\nWalk 12 16\nBike 8 14\nBus 18 11\nTrain 9 13\nEOD\nplot $D using 2:xtic(1) title \"Spring\" lc rgb \"#087e8b\", '' using 3 title \"Autumn\" lc rgb \"#e49c46\"",
      "files": {}
    },
    {
      "id": "error-bars",
      "label": "Measurements with uncertainty",
      "description": "Show observations and standard deviations",
      "tags": [
        "data",
        "error bars"
      ],
      "source": "set title \"Measurements with uncertainty\"\nset xlabel \"Concentration\"\nset ylabel \"Response\"\nset grid\n$D << EOD\n1 2.1 0.3\n2 3.7 0.4\n3 6.2 0.5\n4 7.8 0.4\n5 10.3 0.7\nEOD\nplot 2*x lw 2 lc rgb \"#e49c46\" title \"Expected\", $D using 1:2:3 with yerrorbars pt 7 ps 1.2 lw 2 lc rgb \"#087e8b\" title \"Measured\"",
      "files": {}
    },
    {
      "id": "filled-curves",
      "label": "Under the curve",
      "description": "A shaded Gaussian density",
      "tags": [
        "functions",
        "filled curves"
      ],
      "source": "set title \"Under the curve\"\nset xlabel \"Standard deviations\"\nset ylabel \"Density\"\nset xrange [-4:4]\nset yrange [0:0.45]\nset samples 250\nset style fill transparent solid 0.35 noborder\nf(x)=exp(-x*x/2)/sqrt(2*pi)\nplot f(x) with filledcurves y1=0 lc rgb \"#087e8b\" title \"Normal distribution\", f(x) with lines lw 3 lc rgb \"#087e8b\" notitle",
      "files": {}
    },
    {
      "id": "polar",
      "label": "A rose in polar coordinates",
      "description": "A three-petal parametric shape",
      "tags": [
        "polar",
        "functions"
      ],
      "source": "set title \"A polar rose\"\nset polar\nset angles radians\nset size square\nset samples 500\nset grid polar\nset xrange [-1.2:1.2]\nset yrange [-1.2:1.2]\nunset key\nplot cos(3*t) with lines lw 3 lc rgb \"#087e8b\"",
      "files": {}
    },
    {
      "id": "parametric",
      "label": "Two rhythms",
      "description": "A Lissajous curve",
      "tags": [
        "parametric",
        "functions"
      ],
      "source": "set title \"Two rhythms\"\nset parametric\nset trange [0:2*pi]\nset samples 600\nset size square\nset grid\nset xlabel \"sin(3t)\"\nset ylabel \"sin(4t)\"\nunset key\nplot sin(3*t),sin(4*t) with lines lw 2 lc rgb \"#087e8b\"",
      "files": {}
    },
    {
      "id": "surface",
      "label": "Ripples in three dimensions",
      "description": "A smooth surface with pm3d",
      "tags": [
        "3D",
        "pm3d"
      ],
      "source": "set title \"Ripples in three dimensions\"\nset xlabel \"x\"\nset ylabel \"y\"\nset xrange [-6:6]\nset yrange [-6:6]\nset samples 45\nset isosamples 45\nset view 58,32\nset pm3d\nset palette defined (0 \"#174c68\", 0.5 \"#5fb3b3\", 1 \"#f5cf7d\")\nunset key\nf(x,y)=sin(sqrt(x*x+y*y))/(sqrt(x*x+y*y)+0.01)\nsplot f(x,y) with pm3d",
      "files": {}
    },
    {
      "id": "heatmap",
      "label": "A field of color",
      "description": "A sampled grid rendered with image",
      "tags": [
        "image",
        "data"
      ],
      "source": "set title \"A field of color\"\nset size square\nset xrange [-2.1:2.1]\nset yrange [-2.1:2.1]\nset palette defined (0 \"#183e65\", 0.5 \"#f3f6e8\", 1 \"#db7c4b\")\nunset key\n$D << EOD\n-2.0 -2.0 0.47946\n-1.8 -2.0 0.62335\n-1.6 -2.0 0.72848\n-1.4 -2.0 0.78831\n-1.2 -2.0 0.79914\n-1.0 -2.0 0.76027\n-0.8 -2.0 0.67414\n-0.6 -2.0 0.54609\n-0.4 -2.0 0.38409\n-0.2 -2.0 0.19821\n0.0 -2.0 -0.00000\n0.2 -2.0 -0.19821\n0.4 -2.0 -0.38409\n0.6 -2.0 -0.54609\n0.8 -2.0 -0.67414\n1.0 -2.0 -0.76027\n1.2 -2.0 -0.79914\n1.4 -2.0 -0.78831\n1.6 -2.0 -0.72848\n1.8 -2.0 -0.62335\n2.0 -2.0 -0.47946\n\n-2.0 -1.8 0.37594\n-1.8 -1.8 0.48877\n-1.6 -1.8 0.57120\n-1.4 -1.8 0.61811\n-1.2 -1.8 0.62660\n-1.0 -1.8 0.59613\n-0.8 -1.8 0.52859\n-0.6 -1.8 0.42819\n-0.4 -1.8 0.30116\n-0.2 -1.8 0.15541\n0.0 -1.8 -0.00000\n0.2 -1.8 -0.15541\n0.4 -1.8 -0.30116\n0.6 -1.8 -0.42819\n0.8 -1.8 -0.52859\n1.0 -1.8 -0.59613\n1.2 -1.8 -0.62660\n1.4 -1.8 -0.61811\n1.6 -1.8 -0.57120\n1.8 -1.8 -0.48877\n2.0 -1.8 -0.37594\n\n-2.0 -1.6 0.24905\n-1.8 -1.6 0.32379\n-1.6 -1.6 0.37840\n-1.4 -1.6 0.40948\n-1.2 -1.6 0.41510\n-1.0 -1.6 0.39492\n-0.8 -1.6 0.35018\n-0.6 -1.6 0.28366\n-0.4 -1.6 0.19951\n-0.2 -1.6 0.10296\n0.0 -1.6 -0.00000\n0.2 -1.6 -0.10296\n0.4 -1.6 -0.19951\n0.6 -1.6 -0.28366\n0.8 -1.6 -0.35018\n1.0 -1.6 -0.39492\n1.2 -1.6 -0.41510\n1.4 -1.6 -0.40948\n1.6 -1.6 -0.37840\n1.8 -1.6 -0.32379\n2.0 -1.6 -0.24905\n\n-2.0 -1.4 0.10668\n-1.8 -1.4 0.13869\n-1.6 -1.4 0.16208\n-1.4 -1.4 0.17539\n-1.2 -1.4 0.17780\n-1.0 -1.4 0.16915\n-0.8 -1.4 0.14999\n-0.6 -1.4 0.12150\n-0.4 -1.4 0.08546\n-0.2 -1.4 0.04410\n0.0 -1.4 -0.00000\n0.2 -1.4 -0.04410\n0.4 -1.4 -0.08546\n0.6 -1.4 -0.12150\n0.8 -1.4 -0.14999\n1.0 -1.4 -0.16915\n1.2 -1.4 -0.17780\n1.4 -1.4 -0.17539\n1.6 -1.4 -0.16208\n1.8 -1.4 -0.13869\n2.0 -1.4 -0.10668\n\n-2.0 -1.2 -0.04233\n-1.8 -1.2 -0.05504\n-1.6 -1.2 -0.06432\n-1.4 -1.2 -0.06960\n-1.2 -1.2 -0.07056\n-1.0 -1.2 -0.06713\n-0.8 -1.2 -0.05952\n-0.6 -1.2 -0.04822\n-0.4 -1.2 -0.03391\n-0.2 -1.2 -0.01750\n0.0 -1.2 0.00000\n0.2 -1.2 0.01750\n0.4 -1.2 0.03391\n0.6 -1.2 0.04822\n0.8 -1.2 0.05952\n1.0 -1.2 0.06713\n1.2 -1.2 0.07056\n1.4 -1.2 0.06960\n1.6 -1.2 0.06432\n1.8 -1.2 0.05504\n2.0 -1.2 0.04233\n\n-2.0 -1.0 -0.18871\n-1.8 -1.0 -0.24534\n-1.6 -1.0 -0.28672\n-1.4 -1.0 -0.31027\n-1.2 -1.0 -0.31453\n-1.0 -1.0 -0.29924\n-0.8 -1.0 -0.26533\n-0.6 -1.0 -0.21494\n-0.4 -1.0 -0.15117\n-0.2 -1.0 -0.07801\n0.0 -1.0 0.00000\n0.2 -1.0 0.07801\n0.4 -1.0 0.15117\n0.6 -1.0 0.21494\n0.8 -1.0 0.26533\n1.0 -1.0 0.29924\n1.2 -1.0 0.31453\n1.4 -1.0 0.31027\n1.6 -1.0 0.28672\n1.8 -1.0 0.24534\n2.0 -1.0 0.18871\n\n-2.0 -0.8 -0.32336\n-1.8 -0.8 -0.42039\n-1.6 -0.8 -0.49130\n-1.4 -0.8 -0.53165\n-1.2 -0.8 -0.53895\n-1.0 -0.8 -0.51274\n-0.8 -0.8 -0.45465\n-0.6 -0.8 -0.36829\n-0.4 -0.8 -0.25903\n-0.2 -0.8 -0.13367\n0.0 -0.8 0.00000\n0.2 -0.8 0.13367\n0.4 -0.8 0.25903\n0.6 -0.8 0.36829\n0.8 -0.8 0.45465\n1.0 -0.8 0.51274\n1.2 -0.8 0.53895\n1.4 -0.8 0.53165\n1.6 -0.8 0.49130\n1.8 -0.8 0.42039\n2.0 -0.8 0.32336\n\n-2.0 -0.6 -0.43790\n-1.8 -0.6 -0.56931\n-1.6 -0.6 -0.66532\n-1.4 -0.6 -0.71997\n-1.2 -0.6 -0.72986\n-1.0 -0.6 -0.69436\n-0.8 -0.6 -0.61569\n-0.6 -0.6 -0.49875\n-0.4 -0.6 -0.35079\n-0.2 -0.6 -0.18102\n0.0 -0.6 0.00000\n0.2 -0.6 0.18102\n0.4 -0.6 0.35079\n0.6 -0.6 0.49875\n0.8 -0.6 0.61569\n1.0 -0.6 0.69436\n1.2 -0.6 0.72986\n1.4 -0.6 0.71997\n1.6 -0.6 0.66532\n1.8 -0.6 0.56931\n2.0 -0.6 0.43790\n\n-2.0 -0.4 -0.52521\n-1.8 -0.4 -0.68282\n-1.6 -0.4 -0.79798\n-1.4 -0.4 -0.86353\n-1.2 -0.4 -0.87538\n-1.0 -0.4 -0.83281\n-0.8 -0.4 -0.73846\n-0.6 -0.4 -0.59819\n-0.4 -0.4 -0.42074\n-0.2 -0.4 -0.21712\n0.0 -0.4 0.00000\n0.2 -0.4 0.21712\n0.4 -0.4 0.42074\n0.6 -0.4 0.59819\n0.8 -0.4 0.73846\n1.0 -0.4 0.83281\n1.2 -0.4 0.87538\n1.4 -0.4 0.86353\n1.6 -0.4 0.79798\n1.8 -0.4 0.68282\n2.0 -0.4 0.52521\n\n-2.0 -0.2 -0.57987\n-1.8 -0.2 -0.75388\n-1.6 -0.2 -0.88103\n-1.4 -0.2 -0.95340\n-1.2 -0.2 -0.96649\n-1.0 -0.2 -0.91948\n-0.8 -0.2 -0.81531\n-0.6 -0.2 -0.66045\n-0.4 -0.2 -0.46452\n-0.2 -0.2 -0.23971\n0.0 -0.2 0.00000\n0.2 -0.2 0.23971\n0.4 -0.2 0.46452\n0.6 -0.2 0.66045\n0.8 -0.2 0.81531\n1.0 -0.2 0.91948\n1.2 -0.2 0.96649\n1.4 -0.2 0.95340\n1.6 -0.2 0.88103\n1.8 -0.2 0.75388\n2.0 -0.2 0.57987\n\n-2.0 0.0 -0.59847\n-1.8 0.0 -0.77807\n-1.6 0.0 -0.90930\n-1.4 0.0 -0.98399\n-1.2 0.0 -0.99749\n-1.0 0.0 -0.94898\n-0.8 0.0 -0.84147\n-0.6 0.0 -0.68164\n-0.4 0.0 -0.47943\n-0.2 0.0 -0.24740\n0.0 0.0 0.00000\n0.2 0.0 0.24740\n0.4 0.0 0.47943\n0.6 0.0 0.68164\n0.8 0.0 0.84147\n1.0 0.0 0.94898\n1.2 0.0 0.99749\n1.4 0.0 0.98399\n1.6 0.0 0.90930\n1.8 0.0 0.77807\n2.0 0.0 0.59847\n\n-2.0 0.2 -0.57987\n-1.8 0.2 -0.75388\n-1.6 0.2 -0.88103\n-1.4 0.2 -0.95340\n-1.2 0.2 -0.96649\n-1.0 0.2 -0.91948\n-0.8 0.2 -0.81531\n-0.6 0.2 -0.66045\n-0.4 0.2 -0.46452\n-0.2 0.2 -0.23971\n0.0 0.2 0.00000\n0.2 0.2 0.23971\n0.4 0.2 0.46452\n0.6 0.2 0.66045\n0.8 0.2 0.81531\n1.0 0.2 0.91948\n1.2 0.2 0.96649\n1.4 0.2 0.95340\n1.6 0.2 0.88103\n1.8 0.2 0.75388\n2.0 0.2 0.57987\n\n-2.0 0.4 -0.52521\n-1.8 0.4 -0.68282\n-1.6 0.4 -0.79798\n-1.4 0.4 -0.86353\n-1.2 0.4 -0.87538\n-1.0 0.4 -0.83281\n-0.8 0.4 -0.73846\n-0.6 0.4 -0.59819\n-0.4 0.4 -0.42074\n-0.2 0.4 -0.21712\n0.0 0.4 0.00000\n0.2 0.4 0.21712\n0.4 0.4 0.42074\n0.6 0.4 0.59819\n0.8 0.4 0.73846\n1.0 0.4 0.83281\n1.2 0.4 0.87538\n1.4 0.4 0.86353\n1.6 0.4 0.79798\n1.8 0.4 0.68282\n2.0 0.4 0.52521\n\n-2.0 0.6 -0.43790\n-1.8 0.6 -0.56931\n-1.6 0.6 -0.66532\n-1.4 0.6 -0.71997\n-1.2 0.6 -0.72986\n-1.0 0.6 -0.69436\n-0.8 0.6 -0.61569\n-0.6 0.6 -0.49875\n-0.4 0.6 -0.35079\n-0.2 0.6 -0.18102\n0.0 0.6 0.00000\n0.2 0.6 0.18102\n0.4 0.6 0.35079\n0.6 0.6 0.49875\n0.8 0.6 0.61569\n1.0 0.6 0.69436\n1.2 0.6 0.72986\n1.4 0.6 0.71997\n1.6 0.6 0.66532\n1.8 0.6 0.56931\n2.0 0.6 0.43790\n\n-2.0 0.8 -0.32336\n-1.8 0.8 -0.42039\n-1.6 0.8 -0.49130\n-1.4 0.8 -0.53165\n-1.2 0.8 -0.53895\n-1.0 0.8 -0.51274\n-0.8 0.8 -0.45465\n-0.6 0.8 -0.36829\n-0.4 0.8 -0.25903\n-0.2 0.8 -0.13367\n0.0 0.8 0.00000\n0.2 0.8 0.13367\n0.4 0.8 0.25903\n0.6 0.8 0.36829\n0.8 0.8 0.45465\n1.0 0.8 0.51274\n1.2 0.8 0.53895\n1.4 0.8 0.53165\n1.6 0.8 0.49130\n1.8 0.8 0.42039\n2.0 0.8 0.32336\n\n-2.0 1.0 -0.18871\n-1.8 1.0 -0.24534\n-1.6 1.0 -0.28672\n-1.4 1.0 -0.31027\n-1.2 1.0 -0.31453\n-1.0 1.0 -0.29924\n-0.8 1.0 -0.26533\n-0.6 1.0 -0.21494\n-0.4 1.0 -0.15117\n-0.2 1.0 -0.07801\n0.0 1.0 0.00000\n0.2 1.0 0.07801\n0.4 1.0 0.15117\n0.6 1.0 0.21494\n0.8 1.0 0.26533\n1.0 1.0 0.29924\n1.2 1.0 0.31453\n1.4 1.0 0.31027\n1.6 1.0 0.28672\n1.8 1.0 0.24534\n2.0 1.0 0.18871\n\n-2.0 1.2 -0.04233\n-1.8 1.2 -0.05504\n-1.6 1.2 -0.06432\n-1.4 1.2 -0.06960\n-1.2 1.2 -0.07056\n-1.0 1.2 -0.06713\n-0.8 1.2 -0.05952\n-0.6 1.2 -0.04822\n-0.4 1.2 -0.03391\n-0.2 1.2 -0.01750\n0.0 1.2 0.00000\n0.2 1.2 0.01750\n0.4 1.2 0.03391\n0.6 1.2 0.04822\n0.8 1.2 0.05952\n1.0 1.2 0.06713\n1.2 1.2 0.07056\n1.4 1.2 0.06960\n1.6 1.2 0.06432\n1.8 1.2 0.05504\n2.0 1.2 0.04233\n\n-2.0 1.4 0.10668\n-1.8 1.4 0.13869\n-1.6 1.4 0.16208\n-1.4 1.4 0.17539\n-1.2 1.4 0.17780\n-1.0 1.4 0.16915\n-0.8 1.4 0.14999\n-0.6 1.4 0.12150\n-0.4 1.4 0.08546\n-0.2 1.4 0.04410\n0.0 1.4 -0.00000\n0.2 1.4 -0.04410\n0.4 1.4 -0.08546\n0.6 1.4 -0.12150\n0.8 1.4 -0.14999\n1.0 1.4 -0.16915\n1.2 1.4 -0.17780\n1.4 1.4 -0.17539\n1.6 1.4 -0.16208\n1.8 1.4 -0.13869\n2.0 1.4 -0.10668\n\n-2.0 1.6 0.24905\n-1.8 1.6 0.32379\n-1.6 1.6 0.37840\n-1.4 1.6 0.40948\n-1.2 1.6 0.41510\n-1.0 1.6 0.39492\n-0.8 1.6 0.35018\n-0.6 1.6 0.28366\n-0.4 1.6 0.19951\n-0.2 1.6 0.10296\n0.0 1.6 -0.00000\n0.2 1.6 -0.10296\n0.4 1.6 -0.19951\n0.6 1.6 -0.28366\n0.8 1.6 -0.35018\n1.0 1.6 -0.39492\n1.2 1.6 -0.41510\n1.4 1.6 -0.40948\n1.6 1.6 -0.37840\n1.8 1.6 -0.32379\n2.0 1.6 -0.24905\n\n-2.0 1.8 0.37594\n-1.8 1.8 0.48877\n-1.6 1.8 0.57120\n-1.4 1.8 0.61811\n-1.2 1.8 0.62660\n-1.0 1.8 0.59613\n-0.8 1.8 0.52859\n-0.6 1.8 0.42819\n-0.4 1.8 0.30116\n-0.2 1.8 0.15541\n0.0 1.8 -0.00000\n0.2 1.8 -0.15541\n0.4 1.8 -0.30116\n0.6 1.8 -0.42819\n0.8 1.8 -0.52859\n1.0 1.8 -0.59613\n1.2 1.8 -0.62660\n1.4 1.8 -0.61811\n1.6 1.8 -0.57120\n1.8 1.8 -0.48877\n2.0 1.8 -0.37594\n\n-2.0 2.0 0.47946\n-1.8 2.0 0.62335\n-1.6 2.0 0.72848\n-1.4 2.0 0.78831\n-1.2 2.0 0.79914\n-1.0 2.0 0.76027\n-0.8 2.0 0.67414\n-0.6 2.0 0.54609\n-0.4 2.0 0.38409\n-0.2 2.0 0.19821\n0.0 2.0 -0.00000\n0.2 2.0 -0.19821\n0.4 2.0 -0.38409\n0.6 2.0 -0.54609\n0.8 2.0 -0.67414\n1.0 2.0 -0.76027\n1.2 2.0 -0.79914\n1.4 2.0 -0.78831\n1.6 2.0 -0.72848\n1.8 2.0 -0.62335\n2.0 2.0 -0.47946\nEOD\nplot $D using 1:2:3 with image",
      "files": {}
    },
    {
      "id": "contours",
      "label": "Reading the landscape",
      "description": "Contour lines on a two-dimensional map",
      "tags": [
        "contours",
        "3D"
      ],
      "source": "set title \"Reading the landscape\"\nset contour base\nset cntrparam levels 9\nunset surface\nset view map\nset samples 45\nset isosamples 45\nset xrange [-3:3]\nset yrange [-3:3]\nset key outside\nsplot exp(-((x-1)**2+y*y))-0.7*exp(-((x+1)**2+(y-0.5)**2)) with lines lw 2 notitle",
      "files": {}
    },
    {
      "id": "multiplot",
      "label": "One idea, four views",
      "description": "Arrange several plots on a single page",
      "tags": [
        "multiplot",
        "functions"
      ],
      "source": "set multiplot layout 2,2 title \"One idea, four views\"\nset grid\nset samples 100\nunset key\nset title \"Sine\"\nplot sin(x) lw 2 lc rgb \"#087e8b\"\nset title \"Cosine\"\nplot cos(x) lw 2 lc rgb \"#e49c46\"\nset title \"Damped\"\nplot sin(x)*exp(-abs(x)/5) lw 2 lc rgb \"#087e8b\"\nset title \"Product\"\nplot sin(x)*cos(x) lw 2 lc rgb \"#e49c46\"\nunset multiplot",
      "files": {}
    },
    {
      "id": "time-series",
      "label": "A month of growth",
      "description": "Dates on the horizontal axis",
      "tags": [
        "time",
        "data"
      ],
      "source": "set title \"A month of growth\"\nset xdata time\nset timefmt \"%Y-%m-%d\"\nset format x \"%b %d\"\nset ylabel \"Seedling height (cm)\"\nset grid\nset key top left\n$D << EOD\n2026-04-01 1.2\n2026-04-05 2.4\n2026-04-09 4.1\n2026-04-13 6.5\n2026-04-17 8.2\n2026-04-21 10.4\n2026-04-25 13.0\n2026-04-29 15.1\nEOD\nplot $D using 1:2 with linespoints lw 3 pt 7 lc rgb \"#087e8b\" title \"Height\"",
      "files": {}
    },
    {
      "id": "fitting",
      "label": "Finding the trend",
      "description": "Least-squares fitting and printed statistics",
      "tags": [
        "fit",
        "data"
      ],
      "source": "set title \"Finding the trend\"\nset xlabel \"Input\"\nset ylabel \"Response\"\nset grid\n$D << EOD\n1 23\n2 40\n3 64\n4 79\n5 101\n6 125\nEOD\nf(x)=a*x+b\na=10\nb=0.1\nfit f(x) $D using 1:2 via a,b\nprint sprintf(\"Slope: %.3f; intercept: %.3f\",a,b)\nplot $D using 1:2 with points pt 7 ps 1.2 lc rgb \"#e49c46\" title \"Measurements\", f(x) lw 3 lc rgb \"#087e8b\" title \"Best fit\"",
      "files": {}
    },
    {
      "id": "vectors",
      "label": "A little circulation",
      "description": "A vector field from a datablock",
      "tags": [
        "vectors",
        "data"
      ],
      "source": "set title \"A little circulation\"\nset size square\nset xrange [-3:3]\nset yrange [-3:3]\nunset key\n$D << EOD\n-2 -2 0.48 -0.48\n-1 -2 0.48 -0.24\n0 -2 0.48 0.0\n1 -2 0.48 0.24\n2 -2 0.48 0.48\n-2 -1 0.24 -0.48\n-1 -1 0.24 -0.24\n0 -1 0.24 0.0\n1 -1 0.24 0.24\n2 -1 0.24 0.48\n-2 0 0.0 -0.48\n-1 0 0.0 -0.24\n0 0 0.0 0.0\n1 0 0.0 0.24\n2 0 0.0 0.48\n-2 1 -0.24 -0.48\n-1 1 -0.24 -0.24\n0 1 -0.24 0.0\n1 1 -0.24 0.24\n2 1 -0.24 0.48\n-2 2 -0.48 -0.48\n-1 2 -0.48 -0.24\n0 2 -0.48 0.0\n1 2 -0.48 0.24\n2 2 -0.48 0.48\nEOD\nplot $D using 1:2:3:4 with vectors head filled size screen 0.015,20,60 lw 2 lc rgb \"#087e8b\"",
      "files": {}
    },
    {
      "id": "annotations",
      "label": "Tell the story",
      "description": "Labels and arrows guide the eye",
      "tags": [
        "labels",
        "functions"
      ],
      "source": "set title \"Tell the story\"\nset xrange [0:8]\nset yrange [-0.2:1.4]\nset xlabel \"Time\"\nset ylabel \"Response\"\nset grid\nset label 1 \"A turning point\" at 3.8,1.18 textcolor rgb \"#a96721\"\nset arrow 1 from 4.2,1.1 to 3.14,1 lc rgb \"#a96721\" lw 2\nset label 2 \"Settling down\" at 5.0,0.2 textcolor rgb \"#087e8b\"\nunset key\nplot sin(x/2)*exp(-x/12) with lines lw 3 lc rgb \"#087e8b\"",
      "files": {}
    }
  ]
};
if (typeof module !== 'undefined') module.exports = GnuplotExamples;
else globalThis.GnuplotExamples = GnuplotExamples;
