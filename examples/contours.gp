set title "Reading the landscape"
set contour base
set cntrparam levels 9
unset surface
set view map
set samples 45
set isosamples 45
set xrange [-3:3]
set yrange [-3:3]
set key outside
splot exp(-((x-1)**2+y*y))-0.7*exp(-((x+1)**2+(y-0.5)**2)) with lines lw 2 notitle
