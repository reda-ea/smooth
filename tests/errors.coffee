
describe "Special cases handling", ->
    
    el = document.createElement 'div'
    data =
        name: 'khaoula'
        age: 22
    
    it "ignores illegal binding names", ->
        $(el).append '<span id="s1" data-bind=" @xr ! !@"></span>'
        Smooth.render el, data
        expect ($(el).find '#s1')[0].__smooth.bindings
            .to.be.empty
    
    it "completely ignores a blank binding attribute", ->
        $(el).append '<span id="s2" data-bind="   "></span>'
        Smooth.render el, data
        expect ($(el).find '#s2')[0]
            .not.to.have.property('__smooth')

