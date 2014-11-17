
describe "Undefined values behavior", () ->
    
    el = document.createElement 'div'
    $(el).append '<span id="s1" data-bind="name"></span>'
    data =
        age: 22
    
    beforeEach () ->
        Smooth.render el, data
    
    it "should remove the whole span", () ->
        expect $(el).find '#s1'
            .not.to.exist
