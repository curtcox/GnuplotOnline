set title "A month of growth"
set xdata time
set timefmt "%Y-%m-%d"
set format x "%b %d"
set ylabel "Seedling height (cm)"
set grid
set key top left
$D << EOD
2026-04-01 1.2
2026-04-05 2.4
2026-04-09 4.1
2026-04-13 6.5
2026-04-17 8.2
2026-04-21 10.4
2026-04-25 13.0
2026-04-29 15.1
EOD
plot $D using 1:2 with linespoints lw 3 pt 7 lc rgb "#087e8b" title "Height"
