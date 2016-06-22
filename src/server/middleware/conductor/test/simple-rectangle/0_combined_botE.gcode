; ============================================================
; botE.0000.gcode
; 85bd86b5-7111-4870-b7b8-d210b138ce2c
; start_code
G90; set to absolute coordinates
M82; set extruder to absolute
G21; set units to millimeters
G92 E0; reset extrusion length
M106 S0; turn off fan
M140 S0; set bed temp
M104 S220 T0; begin nozzle temperature change; set nozzle temp
G4 S8; wait for adjacent bot
G28 X0.000; home X
G1 X1.000 F5400; move away
G28 X0.000; home X again
; ============================================================
; botE.0001.gcode
; 52bb89e4-e769-4652-b0d6-c382bf1fc01d
M190 S0; set bed temp
M109 S220 T0; wait for nozzle to reach temperature; set nozzle temp
G28 Y0.000; home Y
G1 Y25.000; move to Y min
G28 Z0.000; home Z
G1 Z1.000 F1080; move away from build plate
; printCeilingSlam
G1 Z30.000
G1 Y1.000 F5400
G1 Z280.000 F1080
G92 Z0
G1 X0.000 Y1.000 Z30.000
G1 Z29.000
G1 Z40.000
G92 Z280
G1 X0.000 Y1.000 Z30.000
G1 Y25.000 F5400
G1 F1080
G28 Z0.000; home Z
G1 Z1.000; move away from build plate
; ============================================================
; botE.0002.gcode
; d550d7f6-c7f2-48e9-bf76-8e24d4673783
G1 X620.321 Y30.765 Z1.300 F5400; move to X entry of next task
; ============================================================
; botE.0003.gcode
; 244f3df2-b457-4b1b-8720-b48b045c21d8
G1 Y31.165; move to point above task toolpaths start
G1 Z0.300 F1080; move down to toolpath start
G1 E1.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X739.028 E5.92232 F4200
G1 Y31.535 E5.94078
G1 X620.321 E11.86310
G1 Y31.165 E11.88156
; rapid-leaky
; bead-perimeter_outer
G1 X739.428 Y30.765 E17.84379 F2400
G1 Y31.935 E17.90216
G1 X619.921 E23.86439
G1 Y30.765 E23.92276
G92 E0
G1 E-1.00000 F1500
G1 Z1.300 F5400; move up from layer plane
; ============================================================
; botE.0004.gcode
; 94a471ce-3daa-4e10-b47a-fcbc9725cef6
G1 X740.228; move to X entry of next task
; ============================================================
; botE.0005.gcode
; e2ada94d-b533-47bf-9bcb-513d5427dfbf
G1 Y31.165; move to point above task toolpaths start
G1 Z0.300 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X858.835 E5.91733 F4200
G1 Y31.535 E5.93579
G1 X740.228 E11.85312
G1 Y31.165 E11.87158
; rapid-leaky
; bead-perimeter_outer
G1 X859.235 Y30.765 E17.82882 F2400
G1 Y31.935 E17.88719
G1 X739.828 E23.84443
G1 Y30.765 E23.90280
G92 E0
G1 E-1.00000 F1500
G1 Z1.300 F5400; move up from layer plane
; ============================================================
; botE.0006.gcode
; 5f38b04b-37c0-41ff-98c3-6671e1a53d01
G1 X739.028 Z1.600; move to X entry of next task
; ============================================================
; botE.0007.gcode
; 78422edb-9568-4fb2-b5b6-a5f2a2eaa602
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 Y31.535 E0.01846 F4200
G1 X620.321 E5.94078
G1 Y31.165 E5.95924
G1 X739.028 E11.88156
; rapid-leaky
; bead-perimeter_outer
G1 X739.428 Y31.935 E11.93993 F2400
G1 X619.921 E17.90216
G1 Y30.765 E17.96053
G1 X739.428 E23.92276
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botE.0008.gcode
; 445152b1-c01f-4bb2-9114-50e2fe1d45e4
G1 X740.228; move to X entry of next task
; ============================================================
; botE.0009.gcode
; 0f47bfbd-bab7-45a2-8315-865c7a8b760d
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X858.835 E5.91733 F4200
G1 Y31.535 E5.93579
G1 X740.228 E11.85312
G1 Y31.165 E11.87158
; rapid-leaky
; bead-perimeter_outer
G1 X859.235 Y30.765 E17.82882 F2400
G1 Y31.935 E17.88719
G1 X739.828 E23.84443
G1 Y30.765 E23.90280
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botE.0010.gcode
; 32682961-c965-4e97-84cb-bae6bf926af5
G1 X739.028; move to X entry of next task
; ============================================================
; botE.0011.gcode
; 5cc4c964-352a-437c-93f8-1e4d8f646fda
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 Y31.535 E0.01846 F4200
G1 X620.321 E5.94078
G1 Y31.165 E5.95924
G1 X739.028 E11.88156
; rapid-leaky
; bead-perimeter_outer
G1 X739.428 Y31.935 E11.93993 F2400
G1 X619.921 E17.90216
G1 Y30.765 E17.96053
G1 X739.428 E23.92276
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botE.0012.gcode
; ed847aa4-52d3-4bba-9291-419ccc88ce41
G1 X740.228; move to X entry of next task
; ============================================================
; botE.0013.gcode
; 59555227-30f3-4ca8-9371-93b7bef5622a
G1 Y31.165; move to point above task toolpaths start
G1 Z0.600 F1080; move down to toolpath start
G1 E0.00000 F1500
G92 E0
; bead-perimeter_inner
G1 X858.835 E5.91733 F4200
G1 Y31.535 E5.93579
G1 X740.228 E11.85312
G1 Y31.165 E11.87158
; rapid-leaky
; bead-perimeter_outer
G1 X859.235 Y30.765 E17.82882 F2400
G1 Y31.935 E17.88719
G1 X739.828 E23.84443
G1 Y30.765 E23.90280
G92 E0
G1 E-1.00000 F1500
G1 Z1.600 F5400; move up from layer plane
; ============================================================
; botE.0014.gcode
; 229f5c49-b3c5-4d72-97e1-2324bac1085a
; printEnd0
G1 Z210.000 F1080; move up from part
G1 Y1.000 F5400; move to park
M140 S0; turn off bed
M109 S0 T0; wait for nozzle to reach temperature; turn off nozzle
M107 ; turn off fans
; ============================================================
; botE.0015.gcode
; 0786c6b2-3c18-4f38-abe9-a47669768178
; printEnd1
G1 X0.000 Y1.000 Z210.000; move to x home
M84 ; disable motors
