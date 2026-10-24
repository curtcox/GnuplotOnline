set title "How we travel"
set ylabel "Trips per week"
set style data histograms
set style histogram clustered gap 1
set style fill solid 0.8 border -1
set boxwidth 0.85
set yrange [0:*]
$D << EOD
Walk 12 16
Bike 8 14
Bus 18 11
Train 9 13
EOD
plot $D using 2:xtic(1) title "Spring" lc rgb "#087e8b", '' using 3 title "Autumn" lc rgb "#e49c46"
