set multiplot layout 2,2 title "One idea, four views"
set grid
set samples 100
unset key
set title "Sine"
plot sin(x) lw 2 lc rgb "#087e8b"
set title "Cosine"
plot cos(x) lw 2 lc rgb "#e49c46"
set title "Damped"
plot sin(x)*exp(-abs(x)/5) lw 2 lc rgb "#087e8b"
set title "Product"
plot sin(x)*cos(x) lw 2 lc rgb "#e49c46"
unset multiplot
